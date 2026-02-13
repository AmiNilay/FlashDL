# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Install system dependencies (FFmpeg is the key here!)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Run the application
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000"]