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

# Download and Unzip the Model from GitHub Releases
ARG MODEL_URL="https://github.com/aayush-chouhan-7050/TrueFrame/releases/download/v1.0.0/TrueFrame-Models-v1.0.zip"
RUN wget -O models.zip "${MODEL_URL}" && \
    unzip models.zip && \
    rm models.zip

# Expose the port the app runs on (Render uses this internally)
EXPOSE 10000

# The CMD is a fallback; the Render Start Command will override it.
CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:10000", "app:app"]