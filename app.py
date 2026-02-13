import os
import shutil
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

# Absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(BASE_DIR, 'cookies.txt')

def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None

@app.route('/')
def home():
    ffmpeg_status = "OK" if is_ffmpeg_installed() else "MISSING"
    cookie_status = "FOUND" if os.path.exists(COOKIES_FILE) else "MISSING"
    return f"FlashDL API. FFmpeg: {ffmpeg_status}. Cookies: {cookie_status}"

@app.route('/extract', methods=['POST'])
def extract_info():
    data = request.json
    url = data.get('url')
    if not url: return jsonify({'success': False, 'error': 'No URL provided'}), 400

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'cookiefile': COOKIES_FILE,
            # Use mobile signatures to bypass 403
            'extractor_args': {'youtube': {'player_client': ['ios', 'android']}},
            'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if 'entries' in info: info = info['entries'][0]

            return jsonify({
                'success': True,
                'title': info.get('title', 'Video'),
                'thumbnail': info.get('thumbnail'),
                'options': [{'format_id': 'best', 'ext': 'mp4'}]
            })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_merge')
def download_media():
    url = request.args.get('url')
    if not url: return "No URL provided", 400

    try:
        tmp_dir = tempfile.gettempdir()
        # Use dynamic extension to prevent "Format not available" errors
        output_template = os.path.join(tmp_dir, 'flashdl_%(id)s.%(ext)s')
        
        ydl_opts = {
            'outtmpl': output_template,
            # FIXED: Try best MP4, fallback to best available
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'quiet': True,
            'cookiefile': COOKIES_FILE,
            'nocheckcertificate': True,
            'extractor_args': {'youtube': {'player_client': ['ios', 'android']}},
            'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            final_filename = ydl.prepare_filename(info)

        if final_filename and os.path.exists(final_filename):
            # We send the file as 'video.mp4' even if it's webm; browsers will still play it
            return send_file(final_filename, as_attachment=True, download_name='video.mp4')
        else:
            return "Error: File download failed.", 500

    except Exception as e:
        return f"Download Failed: {str(e)}", 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)