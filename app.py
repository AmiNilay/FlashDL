import os
import shutil
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(BASE_DIR, 'cookies.txt')


# -----------------------------
# Utility Checks
# -----------------------------
def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None


def get_ydl_base_options():
    return {
        "quiet": True,
        "nocheckcertificate": True,
        "noplaylist": True,
        "retries": 3,
        "fragment_retries": 3,
        "cookiefile": COOKIES_FILE if os.path.exists(COOKIES_FILE) else None,
        "user_agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    }


# -----------------------------
# Health Route
# -----------------------------
@app.route("/")
def home():
    ffmpeg_status = "OK" if is_ffmpeg_installed() else "MISSING"
    cookie_status = "FOUND" if os.path.exists(COOKIES_FILE) else "MISSING"
    return f"FlashDL API Running ✅ | FFmpeg: {ffmpeg_status} | Cookies: {cookie_status}"


# -----------------------------
# Extract Video Info
# -----------------------------
@app.route("/extract", methods=["POST"])
def extract_info():
    data = request.json
    url = data.get("url")

    if not url:
        return jsonify({"success": False, "error": "No URL provided"}), 400

    try:
        ydl_opts = get_ydl_base_options()
        ydl_opts["skip_download"] = True

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            if "entries" in info:
                info = info["entries"][0]

        return jsonify({
            "success": True,
            "title": info.get("title", "Video"),
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
            "options": [
                {"label": "Best Quality (MP4)", "value": "best"}
            ]
        })

    except Exception as e:
        print(f"Extraction Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch video info. Video may be private, age-restricted, or blocked."
        }), 500


# -----------------------------
# Download + Merge Route
# -----------------------------
@app.route("/process_merge")
def download_media():
    url = request.args.get("url")

    if not url:
        return "No URL provided", 400

    try:
        tmp_dir = tempfile.gettempdir()
        filename_template = f"flashdl_{os.urandom(4).hex()}.%(ext)s"
        output_template = os.path.join(tmp_dir, filename_template)

        ydl_opts = get_ydl_base_options()

        # 🔥 Permanent Format Fix
        ydl_opts.update({
            "outtmpl": output_template,

            # Try best video+audio, fallback to best single file
            "format": "bv*+ba/best",

            # Force mp4 output
            "merge_output_format": "mp4",
        })

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloaded_file = ydl.prepare_filename(info)

        # Ensure final mp4 path
        base, _ = os.path.splitext(downloaded_file)
        final_path = base + ".mp4" if os.path.exists(base + ".mp4") else downloaded_file

        return send_file(
            final_path,
            as_attachment=True,
            download_name="video.mp4"
        )

    except Exception as main_error:
        print(f"Main Download Error: {str(main_error)}")

        # 🚑 Fallback: Try simple best format
        try:
            tmp_dir = tempfile.gettempdir()
            fallback_template = os.path.join(
                tmp_dir, f"flashdl_fallback_{os.urandom(4).hex()}.%(ext)s"
            )

            fallback_opts = get_ydl_base_options()
            fallback_opts.update({
                "outtmpl": fallback_template,
                "format": "best",
            })

            with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                downloaded_file = ydl.prepare_filename(info)

            return send_file(
                downloaded_file,
                as_attachment=True,
                download_name="video.mp4"
            )

        except Exception as fallback_error:
            print(f"Fallback Error: {str(fallback_error)}")
            return "Download failed. The video may be restricted or unavailable.", 500


# -----------------------------
# Run App
# -----------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
