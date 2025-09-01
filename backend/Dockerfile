# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps (OpenCV, Ultralytics runtime, ffmpeg, build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

# Copy backend app
COPY . /app

# Ensure uploads/logs exist
RUN mkdir -p /app/logs /app/uploads /app/alerts

# Default environment
ENV APP_ENV=production \
    API_BASE_URL=https://api.safetyai.com \
    YOLO_MODEL_PATH=yolov8n.pt

# Expose Railway port
ENV PORT=8000
EXPOSE 8000

# Start FastAPI app via uvicorn using Railway's PORT
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
