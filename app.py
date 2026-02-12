from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os, shutil, tempfile, random

app = Flask(__name__)
# Replace this with your actual Vercel URL
CORS(app, resources={r"/*": {"origins": "https://flash-dl-five.vercel.app"}})

def is_ffmpeg_installed():
    return shutil.which("ffmpeg") is not None

@app.route('/')
def health_check():
    status = "OK" if is_ffmpeg_installed() else "MISSING"
    return f"FlashDL API is live. FFmpeg Status: {status}"

@app.route('/extract', methods=['POST'])
def extract_info():
    data = request.json
    url = data.get('url')
    if not url: return jsonify({'success': False, 'error': 'No URL'}), 400
    try:
        ydl_opts = {'quiet': True, 'user_agent': 'Mozilla/5.0'}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if 'entries' in info: info = info['entries'][0]
            return jsonify({
                'success': True, 
                'title': info.get('title', 'video'),
                'options': [{'label': f"{f.get('height')}p", 'format_id': f['format_id'], 'merge': True} for f in info.get('formats', []) if f.get('height')],
                'original_url': url
            })
    except Exception as e: return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)