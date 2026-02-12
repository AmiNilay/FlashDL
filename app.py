from flask import Flask, render_template, request, jsonify, Response, stream_with_context, send_file
from flask_cors import CORS
import yt_dlp
import requests
import urllib.parse
import os
import tempfile
import random
import re
import shutil
import subprocess

app = Flask(__name__)
CORS(app)

# 1. SETUP WRITABLE COOKIE PATH
SECRET_PATH = '/etc/secrets/cookies.txt'
COOKIE_PATH = os.path.join(tempfile.gettempdir(), 'cookies_writable.txt')

if os.path.exists(SECRET_PATH):
    try:
        shutil.copy2(SECRET_PATH, COOKIE_PATH)
        print(f"✅ SUCCESS: Copied cookies to {COOKIE_PATH}")
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

# --- HELPER: CHECK IF FFMPEG EXISTS ---
def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None

@app.route('/')
def home():
    return render_template('index.html')

# --- INSTAGRAM SCRAPER FALLBACK ---
def get_instagram_image_fallback(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)'}
        response = requests.get(url, headers=headers, timeout=10)
        match = re.search(r'property="og:image" content="([^"]+)"', response.text)
        return match.group(1).replace('&amp;', '&') if match else None
    except: return None

@app.route('/extract', methods=['POST'])
def extract_info():
    data = request.json
    url = data.get('url')
    if not url: return jsonify({'success': False, 'error': 'No URL provided'}), 400

    try:
        ydl_opts = {
            'quiet': True, 'no_warnings': True, 'extract_flat': False,
            'cookiefile': COOKIE_PATH,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if 'entries' in info and info['entries']: info = info['entries'][0]
            
            title = "".join([c for c in info.get('title', 'media') if c.isalnum() or c==' ']).strip()
            formats = info.get('formats', [])
            is_video = any(f.get('vcodec') != 'none' for f in formats)
            
            if not is_video or 'instagram' in url:
                img_url = info.get('url') or info.get('display_url') or info.get('thumbnail')
                return jsonify({
                    'success': True, 'type': 'image', 'title': title, 'thumbnail': info.get('thumbnail', ''),
                    'proxy_url': f"/proxy_image?url={urllib.parse.quote(img_url)}&filename={urllib.parse.quote(title)}"
                })

            options = []
            seen_res = set()
            # 1080p+ options (Check if FFmpeg exists first)
            ffmpeg_ready = is_ffmpeg_installed()
            
            for f in [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') == 'none']:
                h = f.get('height')
                if h and h >= 1080 and h not in seen_res:
                    label = f"HD {h}p (Best Quality)" if ffmpeg_ready else f"HD {h}p (Needs Server FFmpeg)"
                    options.append({'label': label, 'ext': 'mp4', 'format_id': f['format_id'], 'merge': ffmpeg_ready})
                    seen_res.add(h)
            
            for f in [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']:
                h = f.get('height')
                if h and h not in seen_res:
                    options.append({'label': f"Video {h}p (Direct Download)", 'ext': 'mp4', 'url': f['url'], 'merge': False})
                    seen_res.add(h)

            return jsonify({
                'success': True, 'type': 'video_multi', 'title': title, 'thumbnail': info.get('thumbnail', ''),
                'options': options, 'original_url': url
            })
    except Exception as e: return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_merge')
def process_merge():
    if not is_ffmpeg_installed():
        return "Critical Error: FFmpeg is not installed on this server. HD downloads are disabled.", 500

    url, fid, title = request.args.get('url'), request.args.get('format_id'), request.args.get('title', 'video')
    filename = f"dl_{random.randint(1000, 9999)}.mp4"
    filepath = os.path.join(TEMP_DIR, filename)
    
    ydl_opts = {
        'format': f"{fid}+bestaudio/best", 
        'outtmpl': filepath, 
        'merge_output_format': 'mp4', 
        'quiet': True,
        'cookiefile': COOKIE_PATH,
        'http_headers': {'Referer': 'https://www.youtube.com/'}
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl: ydl.download([url])
        return send_file(filepath, as_attachment=True, download_name=f"{title}.mp4")
    except Exception as e: return f"Backend Error: {str(e)}", 500

@app.route('/proxy_download')
def proxy_download():
    u, t, e = request.args.get('url'), request.args.get('title', 'download'), request.args.get('ext', 'mp4')
    try:
        headers = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.youtube.com/'}
        req = requests.get(u, headers=headers, stream=True, timeout=30)
        return Response(stream_with_context(req.iter_content(chunk_size=8192)), 
                        content_type='application/octet-stream', 
                        headers={'Content-Disposition': f'attachment; filename="{t}.{e}"'})
    except: return "Failed", 404

@app.route('/proxy_image')
def proxy_image():
    u = request.args.get('url')
    try:
        req = requests.get(u, headers={'User-Agent': 'Mozilla/5.0'}, stream=True, timeout=15)
        return Response(stream_with_context(req.iter_content(chunk_size=1024)), content_type='image/jpeg')
    except: return "Failed", 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)