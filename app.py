import os
import shutil
import tempfile
import json
import queue
import threading
from flask import Flask, request, jsonify, send_file, send_from_directory, Response
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(BASE_DIR, 'cookies.txt')

def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None

def get_ydl_opts(tmp_dir, format_type='mp4', progress_hook=None):
    """Configures yt_dlp with stealth headers and cookie support."""
    
    # Impersonate a modern browser
    stealth_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com/',
    }

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'cookiefile': COOKIES_FILE if os.path.exists(COOKIES_FILE) else None,
        'http_headers': stealth_headers,
        # Force identify as 'web' player to reduce bot triggers
        'extractor_args': {'youtube': {'player_client': ['web']}},
    }
    
    if progress_hook:
        ydl_opts['progress_hooks'] = [progress_hook]

    # Handle format specifics
    if format_type == 'mp3':
        ydl_opts.update({
            'outtmpl': os.path.join(tmp_dir, 'flashdl_%(id)s.%(ext)s'),
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        })
    else:
        ydl_opts.update({
            'outtmpl': os.path.join(tmp_dir, 'flashdl_%(id)s.%(ext)s'),
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        })
        
    return ydl_opts

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
        tmp_dir = tempfile.gettempdir()
        ydl_opts = get_ydl_opts(tmp_dir)
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if 'entries' in info: info = info['entries'][0]

            return jsonify({
                'success': True,
                'title': info.get('title', 'Video'),
                'thumbnail': info.get('thumbnail')
            })
    except Exception as e:
        import traceback
        traceback.print_exc() # Logs to your terminal for debugging
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/stream-download')
def stream_download():
    url = request.args.get('url')
    format_type = request.args.get('format', 'mp4')
    if not url: return "No URL provided", 400

    def event_generator():
        q = queue.Queue()

        def progress_hook(d):
            if d['status'] == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded = d.get('downloaded_bytes', 0)
                percent = round((downloaded / total) * 100, 1) if total > 0 else 0
                q.put({'status': 'downloading', 'percent': percent, 'msg': 'Downloading...'})
            elif d['status'] == 'finished':
                q.put({'status': 'processing', 'percent': 95, 'msg': 'Processing...'})

        def run_yt_dlp():
            try:
                tmp_dir = tempfile.gettempdir()
                ydl_opts = get_ydl_opts(tmp_dir, format_type, progress_hook)
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    final_filename = ydl.prepare_filename(info)
                    if format_type == 'mp3':
                        base, _ = os.path.splitext(final_filename)
                        final_filename = base + '.mp3'
                q.put({'status': 'completed', 'filename': os.path.basename(final_filename)})
            except Exception as e:
                q.put({'status': 'error', 'error': str(e)})

        threading.Thread(target=run_yt_dlp).start()
        while True:
            try:
                data = q.get(timeout=1.0)
                yield f"data: {json.dumps(data)}\n\n"
                if data['status'] in ['completed', 'error']: break
            except queue.Empty: yield ": ping\n\n"

    return Response(event_generator(), mimetype='text/event-stream')

@app.route('/download_media')
def download_media_file():
    filename = request.args.get('filename')
    if not filename: return "No filename provided", 400
    file_path = os.path.join(tempfile.gettempdir(), filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return "File not found", 404

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
