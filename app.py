from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
import shutil
import tempfile

app = Flask(__name__)
# Allow Vercel to access this API
CORS(app)

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
    if not url:
        return jsonify({'success': False, 'error': 'No URL provided'}), 400

    try:
        # CONFIGURE YT-DLP TO BYPASS BOT DETECTION
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            # CRITICAL: This file must exist in your Render root folder
            'cookiefile': 'cookies.txt', 
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info without downloading
            info = ydl.extract_info(url, download=False)
            
            # Handle playlists (take first item)
            if 'entries' in info:
                info = info['entries'][0]

            return jsonify({
                'success': True,
                'title': info.get('title', 'Video'),
                'thumbnail': info.get('thumbnail'),
                # Filter for best formats
                'options': [{'format_id': 'best', 'ext': 'mp4'}]
            })

    except Exception as e:
        print(f"Extraction Error: {str(e)}") # Visible in Render Logs
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_merge')
def download_media():
    url = request.args.get('url')
    if not url: return "No URL provided", 400

    try:
        tmp_dir = tempfile.gettempdir()
        output_file = os.path.join(tmp_dir, 'download.mp4')
        
        # Download configuration
        ydl_opts = {
            'outtmpl': output_file,
            'format': 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'quiet': True,
            'cookiefile': 'cookies.txt', # Use cookies here too
            'nocheckcertificate': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        return send_file(output_file, as_attachment=True, download_name='flashdl_video.mp4')

    except Exception as e:
        return f"Download Error: {str(e)}", 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)