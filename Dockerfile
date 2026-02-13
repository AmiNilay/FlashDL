# Use official lightweight Python image
FROM python:3.9-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Upgrade pip and force latest yt-dlp
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -U yt-dlp

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--workers", "2", "--timeout", "180", "--bind", "0.0.0.0:5000", "app:app"]
