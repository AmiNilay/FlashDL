from flask import Flask, render_template, request, jsonify, Response, stream_with_context, send_file
from flask_cors import CORS
import yt_dlp
import requests
import urllib.parse
import os
import tempfile
import random
import re

app = Flask(__name__)
CORS(app)

# 1. SETUP COOKIE PATH
# Checks Render's secret folder first, then local directory
COOKIE_PATH = '/etc/secrets/cookies.txt' if os.path.exists('/etc/secrets/cookies.txt') else 'cookies.txt'

TEMP_DIR = os.path.join(tempfile.gettempdir(), 'flashdl_processing')
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

@app.route('/')
def home():
    return render_template('index.html')

# --- INSTAGRAM DIRECT SCRAPER FALLBACK ---
def get_instagram_image_fallback(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return None
        
        match = re.search(r'property="og:image" content="([^"]+)"', response.text)
        if match:
            return match.group(1).replace('&amp;', '&')
        
        match_json = re.search(r'"display_url":"([^"]+)"', response.text)
        if match_json:
            return match_json.group(1).replace('\\u0026', '&')
            
        return None
    except:
        return None

# --- REDDIT BYPASS ---
def get_reddit_video(url):
    try:
        clean_url = url.split('?')[0].rstrip('/')
        json_url = clean_url + '.json'
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36'}
        r = requests.get(json_url, headers=headers, timeout=10)
        if r.status_code != 200: return None
        data = r.json()
        post = data[0]['data']['children'][0]['data']
        title = post.get('title', 'Reddit Video')
        thumbnail = post.get('thumbnail', '')
        v_url = post['secure_media']['reddit_video'].get('fallback_url') if 'secure_media' in post and post['secure_media'] else None
        if v_url:
            return {
                'success': True, 'type': 'video_single', 'title': title, 'thumbnail': thumbnail,
                'proxy_url': f"/proxy_download?url={urllib.parse.quote(v_url)}&title={urllib.parse.quote(title)}&ext=mp4"
            }
        return None
    except: return None

@app.route('/extract', methods=['POST'])
def extract_info():
    data = request.json
    url = data.get('url')
    if not url: return jsonify({'success': False, 'error': 'No URL provided'}), 400

    def clean_title(t):
        return "".join([c for c in t if c.isalpha() or c.isdigit() or c==' ']).strip()

    if "reddit.com" in url or "redd.it" in url:
        res = get_reddit_video(url)
        if res: return jsonify(res)

    try:
        # Use Cookie Path to bypass bot detection
        ydl_opts = {
            'quiet': True, 
            'no_warnings': True, 
            'extract_flat': False,
            'cookiefile': COOKIE_PATH if os.path.exists(COOKIE_PATH) else None,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if 'entries' in info and info['entries']:
                info = info['entries'][0]
            
            title = clean_title(info.get('title', 'media'))
            thumbnail = info.get('thumbnail', '')
            formats = info.get('formats', [])

            # --- IMAGE DETECTION ---
            is_video = any(f.get('vcodec') != 'none' for f in formats)
            
            if not is_video or info.get('extractor') == 'instagram:image' or 'instagram' in url:
                img_url = info.get('url') or info.get('display_url') or info.get('thumbnail')
                
                if not img_url and formats:
                    img_url = formats[-1].get('url')

                if not img_url or "instagram.com" in url:
                    fallback_url = get_instagram_image_fallback(url)
                    if fallback_url: img_url = fallback_url

                if not img_url:
                    return jsonify({'success': False, 'error': 'Could not find image link'}), 404

                return jsonify({
                    'success': True, 'type': 'image', 'title': title, 'thumbnail': thumbnail,
                    'proxy_url': f"/proxy_image?url={urllib.parse.quote(img_url)}&filename={urllib.parse.quote(title)}"
                })

            # --- VIDEO & AUDIO ---
            options = []
            seen_res = set()

            dash = [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') == 'none']
            dash.sort(key=lambda x: x.get('height', 0) or 0, reverse=True)
            for f in dash:
                h = f.get('height')
                if h and h >= 1080 and h not in seen_res:
                    options.append({'label': f"HD {h}p (Best Quality + Audio)", 'ext': 'mp4', 'format_id': f['format_id'], 'merge': True})
                    seen_res.add(h)

            prog = [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
            prog.sort(key=lambda x: x.get('height', 0) or 0, reverse=True)
            for f in prog:
                h = f.get('height')
                if h and h not in seen_res:
                    options.append({'label': f"Video {h}p (Fast)", 'ext': 'mp4', 'url': f['url'], 'merge': False})
                    seen_res.add(h)

            audio = [f for f in formats if f.get('vcodec') == 'none' and f.get('acodec') != 'none']
            if audio:
                best_a = sorted(audio, key=lambda x: x.get('abr', 0) or 0)[-1]
                options.append({'label': "Audio Only (MP3)", 'ext': 'mp3', 'url': best_a['url'], 'merge': False})

            return jsonify({
                'success': True, 'type': 'video_multi', 'title': title, 'thumbnail': thumbnail,
                'proxy_thumbnail': f"/proxy_image?url={urllib.parse.quote(thumbnail)}",
                'options': options, 'original_url': url
            })

    except Exception as e:
        if 'instagram.com' in url:
            emergency_url = get_instagram_image_fallback(url)
            if emergency_url:
                return jsonify({
                    'success': True, 'type': 'image', 'title': "Instagram Photo", 'thumbnail': emergency_url,
                    'proxy_url': f"/proxy_image?url={urllib.parse.quote(emergency_url)}&filename=instagram_photo"
                })
        return jsonify({'success': False, 'error': f"Extraction failed: {str(e)}"}), 500

# --- MERGE ROUTE (Uses FFmpeg in Docker) ---
@app.route('/process_merge')
def process_merge():
    url, fid, title = request.args.get('url'), request.args.get('format_id'), request.args.get('title', 'video')
    if not url or not fid: return "Invalid parameters", 400
    
    filepath = os.path.join(TEMP_DIR, f"{title}_{random.randint(1000, 9999)}.mp4")
    
    ydl_opts = {
        'format': f"{fid}+bestaudio/best", 
        'outtmpl': filepath, 
        'merge_output_format': 'mp4', 
        'quiet': True,
        'cookiefile': COOKIE_PATH if os.path.exists(COOKIE_PATH) else None,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl: ydl.download([url])
        return send_file(filepath, as_attachment=True, download_name=f"{title}.mp4")
    except Exception as e: return f"Merge Error: {str(e)}", 500

# --- PROXY HANDLERS ---
@app.route('/proxy_download')
def proxy_download():
    u, t, e = request.args.get('url'), request.args.get('title', 'download'), request.args.get('ext', 'mp4')
    if not u: return "No URL", 400
    try:
        req = requests.get(u, headers={'User-Agent': 'Mozilla/5.0'}, stream=True)
        return Response(stream_with_context(req.iter_content(chunk_size=4096)), content_type='application/octet-stream', headers={'Content-Disposition': f'attachment; filename="{t}.{e}"'})
    except: return "Failed", 404

@app.route('/proxy_image')
def proxy_image():
    u = request.args.get('url')
    if not u: return "No URL", 400
    try:
        req = requests.get(u, headers={'User-Agent': 'Mozilla/5.0'}, stream=True, timeout=15)
        return Response(stream_with_context(req.iter_content(chunk_size=1024)), content_type='image/jpeg')
    except: return "Failed", 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)