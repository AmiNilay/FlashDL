from flask import Flask, request, jsonify, Response, stream_with_context, send_file
from flask_cors import CORS
import yt_dlp
import requests
import urllib.parse
import os
import tempfile
import random
import re
import shutil

app = Flask(__name__)

# 1. ROBUST CORS CONFIGURATION
# Allows your Vercel frontend to communicate with this Render backend.
CORS(app, resources={r"/*": {"origins": "*"}}) 

# 2. SETUP WRITABLE COOKIE PATH
# Render secrets are read-only; we copy them to /tmp to make them usable by yt-dlp.
SECRET_PATH = '/etc/secrets/cookies.txt'
COOKIE_PATH = os.path.join(tempfile.gettempdir(), 'cookies_writable.txt')

if os.path.exists(SECRET_PATH):
    try:
        shutil.copy2(SECRET_PATH, COOKIE_PATH)
        print(f"✅ SUCCESS: Cookies copied to {COOKIE_PATH}")
    except Exception as e:
        print(f"❌ ERROR: Cookie copy failed: {e}")
        COOKIE_PATH = SECRET_PATH
elif os.path.exists('cookies.txt'):
    COOKIE_PATH = 'cookies.txt'
else:
    COOKIE_PATH = None

TEMP_DIR = os.path.join(tempfile.gettempdir(), 'flashdl_processing')
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None

@app.route('/')
def home():
    status = "OK" if is_ffmpeg_installed() else "MISSING"
    return f"FlashDL API is live. FFmpeg Status: {status}"

@app.route('/extract', methods=['POST'])
def extract_info():
    data = request.json
    url = data.get('url')
    if not url: return jsonify({'success': False, 'error': 'No URL'}), 400

    try:
        ydl_opts = {
            'quiet': True, 
            'no_warnings': True,
            'cookiefile': COOKIE_PATH,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if 'entries' in info: info = info['entries'][0]
            
            title = "".join([c for c in info.get('title', 'media') if c.isalnum() or c==' ']).strip()
            formats = info.get('formats', [])
            
            options = []
            seen_res = set()
            ffmpeg_ready = is_ffmpeg_installed()
            
            # HD Options (1080p+)
            for f in [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') == 'none']:
                h = f.get('height')
                if h and h >= 1080 and h not in seen_res:
                    options.append({
                        'label': f"HD {h}p (Best Quality)", 
                        'format_id': f['format_id'], 
                        'merge': ffmpeg_ready
                    })
                    seen_res.add(h)
            
            # Progressive Options (720p and below)
            for f in [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']:
                h = f.get('height')
                if h and h not in seen_res:
                    options.append({
                        'label': f"Video {h}p (Fast)", 
                        'url': f['url'], 
                        'merge': False
                    })
                    seen_res.add(h)

            return jsonify({
                'success': True, 
                'type': 'video_multi', 
                'title': title, 
                'options': options, 
                'original_url': url
            })
    except Exception as e: 
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_merge')
def process_merge():
    url = request.args.get('url')
    fid = request.args.get('format_id')
    title = request.args.get('title', 'video')
    
    filepath = os.path.join(TEMP_DIR, f"dl_{random.randint(1000, 9999)}.mp4")
    
    ydl_opts = {
        'format': f"{fid}+bestaudio/best", 
        'outtmpl': filepath, 
        'merge_output_format': 'mp4', 
        'cookiefile': COOKIE_PATH,
        'http_headers': {'Referer': 'https://www.youtube.com/'}
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl: 
            ydl.download([url])
        return send_file(filepath, as_attachment=True, download_name=f"{title}.mp4")
    except Exception as e: 
        return f"Merge Error: {str(e)}", 500

# 3. DYNAMIC PORT BINDING
if __name__ == '__main__':
    # Listen to the port Render provides, or default to 5000
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)