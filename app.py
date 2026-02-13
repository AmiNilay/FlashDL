import os
import shutil
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)

# ✅ Proper production CORS config
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

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
        "retries": 10,
        "fragment_retries": 10,
        "cookiefile": COOKIES_FILE if os.path.exists(COOKIES_FILE) else None,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
    }


# -----------------------------
# Global Error Handler (IMPORTANT)
# -----------------------------
@app.errorhandler(Exception)
def handle_exception(e):
    print("GLOBAL ERROR:", str(e))
    return jsonify({
        "success": False,
        "error": "Server error occurred."
    }), 500


# -----------------------------
# Health Route
# -----------------------------
@app.route("/")
def home():
    ffmpeg_status = "OK" if is_ffmpeg_installed() else "MISSING"
    cookie_status = "FOUND" if os.path.exists(COOKIES_FILE) else "MISSING"
    return jsonify({
        "status": "running",
        "ffmpeg": ffmpeg_status,
        "cookies": cookie_status
    })


# -----------------------------
# Extract Video Info
# -----------------------------
@app.route("/extract", methods=["POST"])
def extract_info():
    data = request.json
    url = data.get("url")

    if not url:
        return jsonify({"success": False, "error": "No URL provided"}), 400

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


# -----------------------------
# Download + Merge Route
# -----------------------------
@app.route("/process_merge")
def download_media():
    url = request.args.get("url")

    if not url:
        return jsonify({"success": False, "error": "No URL provided"}), 400

    tmp_dir = tempfile.gettempdir()
    filename_template = f"flashdl_{os.urandom(4).hex()}.%(ext)s"
    output_template = os.path.join(tmp_dir, filename_template)

    ydl_opts = get_ydl_base_options()

    ydl_opts.update({
        "outtmpl": output_template,
        "format": "bv*+ba/best",
        "merge_output_format": "mp4",
    })

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        downloaded_file = ydl.prepare_filename(info)

    base, _ = os.path.splitext(downloaded_file)
    final_path = base + ".mp4" if os.path.exists(base + ".mp4") else downloaded_file

    return send_file(
        final_path,
        as_attachment=True,
        download_name="video.mp4"
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
