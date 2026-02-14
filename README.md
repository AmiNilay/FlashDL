# ⚡ **FlashDL** - Universal Social Media Downloader

**FlashDL** is a high-performance web application designed to facilitate the downloading of videos and images from popular social media platforms, including **YouTube**, **Reddit**, **Instagram**, **TikTok**, and **Pinterest**.

Unlike traditional downloaders, FlashDL utilizes **Server-Side Merging**, enabling the seamless download of high-quality YouTube videos (up to 1080p and 4K) with full audio, by processing media files on the backend using FFmpeg.

---

## 🚀 **Key Features**

- **Multi-Platform Support**: Download videos and images from a variety of platforms, including Reddit, Instagram, TikTok, Pinterest, and YouTube.
- **High-Quality YouTube Downloads**: Take advantage of server-side video and audio merging using FFmpeg, ensuring high-definition downloads (1080p/4K).
- **Audio Extraction**: Effortlessly extract high-bitrate MP3 audio from any supported video link.
- **Reddit Bypass**: Includes robust error handling to bypass 403 Forbidden errors encountered with Reddit links.
- **Modern UI**: A clean, responsive design enhanced by Materialize CSS components and support for **Dark Mode**.
- **User History**: Local storage-based history tracking for authenticated users, allowing easy access to previously downloaded content.

---

## 🛠️ **Technical Stack**

- **Backend**: Python, Flask
- **Video & Audio Extraction**: `yt-dlp`
- **Media Processing**: FFmpeg
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Materialize CSS

---

## ⚙️ **Installation & Setup**

### 1. **Prerequisites**

Ensure that the following dependencies are installed before proceeding:

- **Python 3.8+**
- **FFmpeg**: FFmpeg is required for media merging. Ensure FFmpeg is installed and accessible through your system PATH.

### 2. **Clone the Repository**

Clone the repository to your local machine:

```bash
git clone https://github.com/yourusername/social_downloader.git
cd social_downloader
