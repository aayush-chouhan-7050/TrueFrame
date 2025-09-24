# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies required by OpenCV and other tools (like wget and unzip)
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 wget unzip

# Set the working directory in the container
WORKDIR /app

# --- NEW: Download and Unzip the Model from GitHub Releases ---
# Define the URL to your GitHub Release zip file
ARG MODEL_URL="https://github.com/aayush-chouhan-7050/TrueFrame/releases/download/v1.0.0/TrueFrame-Models-v1.0.zip"

# Download the zip file, unzip it, and then clean up
RUN wget -O models.zip "${MODEL_URL}" && \
    unzip models.zip && \
    rm models.zip

# Copy the application's code and dependencies to the working directory
COPY requirements.txt .
COPY app.py .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 5001 available to the world outside this container
EXPOSE 5001

# Run app.py when the container launches using gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "app:app"]