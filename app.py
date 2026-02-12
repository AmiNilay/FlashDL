from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
import shutil
import tempfile
import random

app = Flask(__name__)
# Allow your Vercel URL to talk to this backend
CORS(app, resources={r"/*": {"origins": "https://flash-dl-five.vercel.app"}})

# --- WRITABLE COOKIE SETUP (Fixes Read-only filesystem) ---
SECRET_PATH = '/etc/secrets/cookies.txt'
COOKIE_PATH = os.path.join(tempfile.gettempdir(), 'cookies_writable.txt')

if os.path.exists(SECRET_PATH):
    try:
        shutil.copy2(SECRET_PATH, COOKIE_PATH)
    except:
        COOKIE_PATH = SECRET_PATH
else:
    COOKIE_PATH = None

def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None

@app.route('/')
def health_check():
    # This is the ONLY thing your Render URL should show
    status = "OK" if is_ffmpeg_installed() else "MISSING"
    return f"FlashDL API is live. FFmpeg Status: {status}"

@app.route('/extract', methods=['POST'])
def extract_info():
    url = request.json.get('url')
    if not url: return jsonify({'success': False, 'error': 'No URL'}), 400
    try:
        ydl_opts = {
            'quiet': True, 'cookiefile': COOKIE_PATH,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36'
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            # Simplification: Only return necessary data for the frontend
            return jsonify({
                'success': True, 
                'title': info.get('title', 'video'),
                'options': [{'label': f"{f.get('height')}p", 'format_id': f['format_id']} for f in info.get('formats', []) if f.get('height')],
                'original_url': url
            })
    except Exception as e: return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)