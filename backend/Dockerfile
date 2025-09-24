# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies required by OpenCV and other tools
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 wget unzip

# Set the working directory in the container
WORKDIR /app

# Copy ONLY the requirements file first to leverage Docker caching
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Now, copy the application code
COPY app.py .

# --- Download, Unzip, and Reorganize the Model ---
ARG MODEL_URL="https://github.com/aayush-chouhan-7050/TrueFrame/releases/download/v1.0.0/TrueFrame-Models-v1.0.zip"

RUN wget -O models.zip "${MODEL_URL}" && \
    unzip models.zip && \
    # --- FIX & DEBUG ---
    # 1. (DEBUG) List all files recursively to see the structure in the logs
    echo "--- File structure after unzip ---" && \
    ls -R && \
    # 2. (FIX) Find all .pth files, even in subdirectories, and move them here
    find . -name "*.pth" -exec mv {} . \; && \
    # 3. (CLEANUP)
    rm -f models.zip && \
    # 4. (DEBUG) List files again to confirm they were moved
    echo "--- File structure after moving models ---" && \
    ls -l

# Expose the port the app runs on
EXPOSE 10000

# The CMD is a fallback; the Render Start Command will override it.
CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:10000", "app:app"]