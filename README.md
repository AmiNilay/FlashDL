```markdown
# ⚡ FlashDL - Universal Social Media Downloader

FlashDL is a high-performance web application designed to download videos and images from major social platforms including **YouTube, Reddit, Instagram, TikTok, and Pinterest**. 

Unlike basic downloaders, FlashDL features **Server-Side Merging**, allowing users to download high-quality YouTube videos (1080p and 4K) with full audio by processing them through FFmpeg on the backend.

---

## 🚀 Key Features

- **Multi-Platform Support:** Works with Reddit, Instagram, TikTok, Pinterest, and YouTube.
- **High-Quality YouTube Downloads:** Server-side merging using FFmpeg to combine separate 1080p/4K video and audio streams.
- **Audio Extraction:** High-bitrate audio (MP3) extraction from any video link.
- **Reddit Bypass:** Robust fallback logic to bypass 403 Forbidden errors on Reddit links.
- **Modern UI:** Clean, responsive design with **Dark Mode** support and Materialize CSS components.
- **User History:** Local storage-based history tracking for logged-in users.

---

## 🛠️ Technical Stack

- **Backend:** Python, Flask
- **Extraction Engine:** `yt-dlp`
- **Media Processing:** FFmpeg
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla), Materialize CSS

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- **Python 3.8+**
- **FFmpeg:** This is required for high-quality merging. Ensure `ffmpeg` is installed and added to your system PATH.

### 2. Clone the Repository
```bash
git clone [https://github.com/yourusername/social_downloader.git](https://github.com/yourusername/social_downloader.git)
cd social_downloader

```

### 3. Install Dependencies

```bash
pip install -r requirements.txt

```

### 4. Run the Application

```bash
python app.py

```

Access the app at `http://127.0.0.1:5000` in your browser.

---

## ☁️ Deployment Notes

This application requires a persistent environment to handle server-side processing.

* **Recommended:** **Render** or **Railway** (Supports FFmpeg and long-running processes).
* **Not Recommended:** **Vercel** (Vercel’s 10-60s timeout will likely interrupt the merging of 1080p+ videos).

---

## 📜 Disclaimer

This tool is intended for educational purposes and personal use only. Please respect the copyright and terms of service of the respective social media platforms.

```

---

### **How to add this to your project:**
1.  Open your project folder.
2.  Create a new file named `README.md`.
3.  Paste the content above into the file.
4.  Commit and push to your GitHub.

```
