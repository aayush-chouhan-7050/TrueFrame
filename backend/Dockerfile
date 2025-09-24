# backend/Dockerfile - Updated for Render
FROM python:3.11-slim

# Install system dependencies required by OpenCV and other tools
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy requirements first for better Docker caching
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY app.py .

# Download and extract the model files
ARG MODEL_URL="https://github.com/aayush-chouhan-7050/TrueFrame/releases/download/v1.0.0/TrueFrame-Models-v1.0.zip"

RUN echo "📥 Downloading models from: ${MODEL_URL}" && \
    wget --retry-connrefused --waitretry=1 --read-timeout=20 --timeout=15 -t 3 \
         -O models.zip "${MODEL_URL}" && \
    echo "📦 Extracting models..." && \
    unzip models.zip && \
    echo "🔍 Checking extracted files:" && \
    ls -la && \
    echo "🔧 Moving .pth files to working directory:" && \
    find . -name "*.pth" -exec mv {} . \; && \
    echo "✅ Final file structure:" && \
    ls -la *.pth && \
    rm -f models.zip && \
    echo "🎯 Model setup complete!"

# Expose the port that Render expects
EXPOSE 10000

# Start the application with Gunicorn for production
CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:10000", "--workers", "1", "--timeout", "120", "app:app"]