import os
import shutil
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
# Allow Vercel to access this API
CORS(app)

# 1. SETUP ABSOLUTE PATHS TO PREVENT FILE NOT FOUND ERRORS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(BASE_DIR, 'cookies.txt')

def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None

@app.route('/')
def home():
    # Debug info to check if server is healthy
    cookie_status = "FOUND" if os.path.exists(COOKIES_FILE) else "MISSING"
    ffmpeg_status = "OK" if is_ffmpeg_installed() else "MISSING"
    return f"FlashDL API. FFmpeg: {ffmpeg_status}. Cookies: {cookie_status}"

@app.route('/extract', methods=['POST'])
def extract_info():
    data = request.json
    url = data.get('url')
    if not url: return jsonify({'success': False, 'error': 'No URL provided'}), 400

    try:
        # Configuration to bypass bot detection
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'cookiefile': COOKIES_FILE,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Handle playlists (just take the first video)
            if 'entries' in info:
                info = info['entries'][0]

            return jsonify({
                'success': True,
                'title': info.get('title', 'Video'),
                'thumbnail': info.get('thumbnail'),
                # We return a generic 'best' option to the frontend
                'options': [{'format_id': 'best', 'ext': 'mp4'}]
            })

    except Exception as e:
        print(f"Extraction Error: {str(e)}")
        if "Sign in" in str(e):
             return jsonify({'success': False, 'error': 'YouTube blocked the server. Cookies need refresh.'}), 403
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_merge')
def download_media():
    url = request.args.get('url')
    if not url: return "No URL provided", 400

    try:
        tmp_dir = tempfile.gettempdir()
        output_file = os.path.join(tmp_dir, 'download.mp4')
        
        # FIXED: "Safe Mode" Format Selection
        # This tells yt-dlp: "Give me the best MP4 you have ready."
        # It avoids the complex merging that was causing your error.
        ydl_opts = {
            'outtmpl': output_file,
            'format': 'best[ext=mp4]/best', 
            'quiet': True,
            'cookiefile': COOKIES_FILE,
            'nocheckcertificate': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        return send_file(output_file, as_attachment=True, download_name='flashdl_video.mp4')

    except Exception as e:
        print(f"Download Error: {str(e)}")
        return f"Download Failed: {str(e)}", 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)