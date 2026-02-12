# Use a modern Python version
FROM python:3.11-slim

# Install system dependencies (FFmpeg)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application
COPY . .

EXPOSE 5000

# Use $PORT from Render to prevent port-detection restart loops
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT --timeout 120 --workers 2 app:app"]