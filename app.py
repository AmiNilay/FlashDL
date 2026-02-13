import os
import shutil
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(BASE_DIR, 'cookies.txt')


# -----------------------------
# Utility
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
        "geo_bypass": True,
        "geo_bypass_country": "US",
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
# Health Route
# -----------------------------
@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "ffmpeg": "OK" if is_ffmpeg_installed() else "MISSING",
        "cookies": "FOUND" if os.path.exists(COOKIES_FILE) else "MISSING"
    })


# -----------------------------
# Extract Info Route
# -----------------------------
@app.route("/extract", methods=["POST"])
def extract_info():
    data = request.json
    url = data.get("url")

    if not url:
        return jsonify({"success": False, "error": "No URL provided"}), 400

    ydl_opts = get_ydl_base_options()
    ydl_opts["skip_download"] = True
    ydl_opts["format"] = "best"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            if "entries" in info:
                info = info["entries"][0]

        return jsonify({
            "success": True,
            "title": info.get("title"),
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# -----------------------------
# FREE DOWNLOAD ROUTE
# -----------------------------
@app.route("/process_merge")
def process_merge():
    url = request.args.get("url")

    if not url:
        return jsonify({"success": False, "error": "No URL provided"}), 400

    ydl_opts = get_ydl_base_options()
    ydl_opts["skip_download"] = True
    ydl_opts["format"] = "best"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            if "entries" in info:
                info = info["entries"][0]

            direct_url = info.get("url")

        return jsonify({
            "success": True,
            "download_url": direct_url,
            "title": info.get("title")
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
