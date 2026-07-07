# ⚡ FlashDL - Universal Social Media Downloader

FlashDL is a high-performance web application that enables users to download videos and images from multiple popular social media platforms through a single, intuitive interface.

Unlike conventional downloaders, FlashDL performs **server-side media processing** using **FFmpeg**, allowing high-quality YouTube downloads by merging separate video and audio streams on the backend. This approach supports resolutions up to **1080p and 4K** while preserving original audio quality.

---

## 🌟 Overview

FlashDL provides a unified solution for downloading media from:

- YouTube
- Instagram
- Reddit
- TikTok
- Pinterest

The application combines **yt-dlp** for media extraction with **FFmpeg** for server-side processing, ensuring fast, reliable, and high-quality downloads.

---

# ✨ Features

## 📥 Multi-Platform Downloader

Download videos and images from multiple social media platforms through a single interface.

Supported platforms:

- YouTube
- Reddit
- Instagram
- TikTok
- Pinterest

---

## 🎥 High-Quality YouTube Downloads

Unlike standard downloaders that only retrieve a single media stream, FlashDL downloads the highest available video and audio streams separately and merges them using FFmpeg on the server.

Supports:

- 720p
- 1080p
- 1440p
- 4K (where available)

---

## 🎵 Audio Extraction

Extract high-quality MP3 audio directly from supported video URLs.

Perfect for:

- Music
- Podcasts
- Lectures
- Audiobooks

---

## 🛡 Reddit Compatibility

Includes additional handling for Reddit media URLs to reduce common download failures, including 403 Forbidden responses.

---

## 🎨 Modern User Interface

Designed with a clean and responsive interface using Materialize CSS.

Features include:

- Responsive layout
- Dark Mode
- Mobile-friendly design
- Fast navigation

---

## 📜 Download History

Stores download history locally in the browser, allowing authenticated users to quickly revisit previously downloaded media.

---

# 🛠 Technology Stack

## Backend

- Python
- Flask

## Media Processing

- FFmpeg

## Media Extraction

- yt-dlp

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Materialize CSS

---

# ⚙ Installation

## Prerequisites

Before running FlashDL, install the following:

- Python 3.8 or newer
- FFmpeg (must be added to your system PATH)
- Git

---

## Clone Repository

```bash
git clone https://github.com/yourusername/flashdl.git
cd flashdl
```

---

## Create Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Run the Application

```bash
python app.py
```

The application will be available at:

```
http://localhost:5000
```

---

# 📂 Project Structure

```
FlashDL/
│
├── app.py
├── requirements.txt
├── static/
│   ├── css/
│   ├── js/
│   └── images/
│
├── templates/
│   ├── index.html
│   └── history.html
│
├── downloads/
├── utils/
└── README.md
```

---

# 🚀 Future Improvements

- Playlist downloading
- Batch URL processing
- Subtitle downloading
- Download scheduling
- User accounts and cloud history
- Browser extension
- Docker deployment
- Download queue management

---

# 📄 License

This project is intended for educational and personal use only.

Users are responsible for complying with the terms of service and copyright policies of the respective platforms.

---

## 👨‍💻 Developed By

**Nilay Naha**
