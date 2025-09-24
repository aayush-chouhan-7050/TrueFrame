# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies required by OpenCV and other tools
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 wget unzip

# Set the working directory in the container
WORKDIR /app

# Copy ONLY the requirements file first
COPY requirements.txt .

# Install Python packages. This layer will be cached by Docker.
RUN pip install --no-cache-dir -r requirements.txt

# Now, copy the rest of your application code
COPY . .

# --- Download and Unzip the Model from GitHub Releases ---
ARG MODEL_URL="https://github.com/aayush-chouhan-7050/TrueFrame/releases/download/v1.0.0/TrueFrame-Models-v1.0.zip"
RUN wget -O models.zip "${MODEL_URL}" && \
    unzip models.zip && \
    rm models.zip