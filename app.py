from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os, shutil, tempfile

app = Flask(__name__)
CORS(app) # Crucial for Vercel communication

@app.route('/')
def home():
    return "FlashDL API is live. FFmpeg is " + ("OK" if shutil.which("ffmpeg") else "MISSING")

@app.route('/extract', methods=['POST'])
def extract():
    url = request.json.get('url')
    try:
        ydl_opts = {'quiet': True, 'no_warnings': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return jsonify({
                'success': True,
                'title': info.get('title', 'Media'),
                'options': [{'format_id': 'best'}] # Simplified for stability
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_merge')
def download():
    url = request.args.get('url')
    # This handles both YouTube and Pinterest automatically
    tmp_dir = tempfile.gettempdir()
    output = os.path.join(tmp_dir, 'download.mp4')
    ydl_opts = {'outtmpl': output, 'format': 'best'}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    return send_file(output, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))