import os
import shutil
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)

# ✅ Strong CORS for production
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
        "retries": 15,
        "fragment_retries": 15,
        "socket_timeout": 30,
        "geo_bypass": True,
        "geo_bypass_country": "US",
        "cookiefile": COOKIES_FILE if os.path.exists(COOKIES_FILE) else None,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9"
        }
    }


# -----------------------------
# Global Error Handler (Debug Mode Enabled)
# -----------------------------
@app.errorhandler(Exception)
def handle_exception(e):
    print("GLOBAL ERROR:", str(e))
    return jsonify({
        "success": False,
        "error": str(e)  # Shows real error for debugging
    }), 500


# -----------------------------
# Health Route
# -----------------------------
@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "ffmpeg_installed": is_ffmpeg_installed(),
        "cookies_found": os.path.exists(COOKIES_FILE)
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
