import os
import shutil
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
# Allow Vercel frontend to talk to this backend
CORS(app)

# Setup path for cookies
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(BASE_DIR, 'cookies.txt')

def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None

@app.route('/')
def home():
    # Health check
    ffmpeg_status = "OK" if is_ffmpeg_installed() else "MISSING"
    cookie_status = "FOUND" if os.path.exists(COOKIES_FILE) else "MISSING"
    return f"FlashDL API. FFmpeg: {ffmpeg_status}. Cookies: {cookie_status}"

@app.route('/extract', methods=['POST'])
def extract_info():
    data = request.json
    url = data.get('url')
    if not url: return jsonify({'success': False, 'error': 'No URL provided'}), 400

    try:
        # Config to peek at video info
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'cookiefile': COOKIES_FILE,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
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
        print(f"Extraction Error: {str(e)}")
        if "Sign in" in str(e):
             return jsonify({'success': False, 'error': 'Server blocked by YouTube. Refresh cookies.'}), 403
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_merge')
def download_media():
    url = request.args.get('url')
    if not url: return "No URL provided", 400

    try:
        tmp_dir = tempfile.gettempdir()
        # Random filename to prevent conflicts
        filename = f"flashdl_{os.urandom(4).hex()}.mp4"
        output_file = os.path.join(tmp_dir, filename)
        
        # FIXED: Use 'best' format. 
        # This tells yt-dlp to grab the best SINGLE file. 
        # It prevents the "Format Not Available" error because it doesn't need to merge streams.
        ydl_opts = {
            'outtmpl': output_file,
            'format': 'best', 
            'quiet': True,
            'cookiefile': COOKIES_FILE,
            'nocheckcertificate': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Fallback: Check if file was saved with a different extension
        final_path = output_file
        if not os.path.exists(output_file):
            for ext in ['.mkv', '.webm', '.webp']:
                if os.path.exists(output_file + ext):
                    final_path = output_file + ext
                    break
                # Handle cases where extension was replaced
                replaced_path = output_file.replace('.mp4', ext)
                if os.path.exists(replaced_path):
                    final_path = replaced_path
                    break

        return send_file(final_path, as_attachment=True, download_name='video.mp4')

    except Exception as e:
        print(f"Download Error: {str(e)}")
        return f"Download Failed: {str(e)}", 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)