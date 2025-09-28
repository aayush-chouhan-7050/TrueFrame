# --- Imports ---
import os
import tempfile
import random
import logging
import torch
import torch.nn as nn
from torchvision import models, transforms
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import cv2
from PIL import Image
from typing import List, Dict, Union
from dotenv import load_dotenv

# --- Configuration & Setup ---
load_dotenv()
# Grouping constants for easier management.
class Config:
    PORT = int(os.environ.get("PORT", 5001))
    MODEL_PATH = os.environ.get("MODEL_PATH", "deepfake_detector_ultimate_model.pth")
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
    MAX_CONTENT_LENGTH_MB = 100
    CLASS_NAMES = ['fake', 'real']
    FRAME_INTERVAL = int(os.environ.get("FRAME_INTERVAL", 30))
    PREDICTION_THRESHOLD = 0.5
    INFERENCE_BATCH_SIZE = int(os.environ.get("INFERENCE_BATCH_SIZE", 16))

# Setup professional logging.
logging.basicConfig(level=Config.LOG_LEVEL, format='%(asctime)s - %(levelname)s - %(message)s')

# --- App Initialization ---
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH_MB * 1024 * 1024

# --- Model Loading & GPU Detection ---
logging.info("🚀 Initializing TrueFrame AI Engine...")
# Automatically detect and use CUDA GPU if available for massive performance gain.
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logging.info(f"✅ Using inference device: {DEVICE}")

# Load the model architecture.
model = models.efficientnet_b0(weights=None)
num_features = model.classifier[1].in_features
model.classifier[1] = nn.Linear(num_features, len(Config.CLASS_NAMES))

# Error handling for model loading.
if not os.path.exists(Config.MODEL_PATH):
    logging.error(f"❌ FATAL: Model weights file not found at '{Config.MODEL_PATH}'")
    exit()
try:
    # Load weights onto the correct device (CPU or GPU).
    model.load_state_dict(torch.load(Config.MODEL_PATH, map_location=DEVICE))
    model.to(DEVICE)
    model.eval() # Set model to evaluation mode.
    logging.info("✅ AI Engine loaded and ready.")
except Exception as e:
    logging.error(f"❌ FATAL: Error loading model weights: {e}")
    exit()

# --- Image Transformations ---
inference_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# --- Analysis Breakdown Logic ---
def generate_analysis_breakdown(confidence: float, is_fake: bool) -> List[Dict[str, str]]:
    """Generates a simulated analysis breakdown based on the confidence score."""
    breakdown = []
    if is_fake:
        if confidence > 95:
            breakdown = [
                {"name": "Facial Inconsistencies", "tag": "High"},
                {"name": "Temporal Artifacts", "tag": "Detected"},
                {"name": "Compression Patterns", "tag": "Suspicious"},
                {"name": "Motion Analysis", "tag": "Natural"}
            ]
        elif confidence > 75:
            breakdown = [
                {"name": "Facial Inconsistencies", "tag": "Suspicious"},
                {"name": "Temporal Artifacts", "tag": "Detected"},
                {"name": "Compression Patterns", "tag": "Suspicious"},
                {"name": "Motion Analysis", "tag": "Natural"}
            ]
        else:
            breakdown = [
                {"name": "Facial Inconsistencies", "tag": "Suspicious"},
                {"name": "Temporal Artifacts", "tag": "Natural"},
                {"name": "Compression Patterns", "tag": "Suspicious"},
                {"name": "Motion Analysis", "tag": "Natural"}
            ]
    else:
        if confidence > 95:
            breakdown = [
                {"name": "Facial Inconsistencies", "tag": "Natural"},
                {"name": "Temporal Artifacts", "tag": "Natural"},
                {"name": "Compression Patterns", "tag": "Natural"},
                {"name": "Motion Analysis", "tag": "Natural"}
            ]
        else:
            breakdown = [
                {"name": "Facial Inconsistencies", "tag": "Natural"},
                {"name": "Temporal Artifacts", "tag": "Natural"},
                {"name": "Compression Patterns", "tag": "Suspicious"},
                {"name": "Motion Analysis", "tag": "Natural"}
            ]
    random.shuffle(breakdown)
    return breakdown

# --- Core Prediction Logic ---
@torch.no_grad() # Decorator to disable gradient calculations for inference speedup.
def analyze_video_frames(video_path: str) -> Dict[str, Union[str, List, float]]:
    """Extracts frames, runs batched inference, and aggregates results."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logging.error(f"Cannot open video file: {video_path}")
        return {"error": "Cannot open video file. It may be corrupt."}
    
    predictions = []
    frame_batch = []
    frame_count = 0
    
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break # End of video.
            
            # Process one frame every `FRAME_INTERVAL`.
            if frame_count % Config.FRAME_INTERVAL == 0:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                image_tensor = inference_transforms(pil_image)
                frame_batch.append(image_tensor)

                # When the batch is full, run inference.
                if len(frame_batch) == Config.INFERENCE_BATCH_SIZE:
                    batch_tensor = torch.stack(frame_batch).to(DEVICE)
                    outputs = model(batch_tensor)
                    probabilities = torch.nn.functional.softmax(outputs, dim=1)
                    # Get the 'fake' probability for each item in the batch.
                    fake_probs = probabilities[:, Config.CLASS_NAMES.index('fake')].cpu().numpy()
                    predictions.extend(fake_probs)
                    frame_batch.clear() # Reset the batch.

            frame_count += 1
            
        # Process any remaining frames in the last batch.
        if frame_batch:
            batch_tensor = torch.stack(frame_batch).to(DEVICE)
            outputs = model(batch_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            fake_probs = probabilities[:, Config.CLASS_NAMES.index('fake')].cpu().numpy()
            predictions.extend(fake_probs)

    finally:
        cap.release()
        logging.info(f"Processed {len(predictions)} frames from video: {os.path.basename(video_path)}")

    if not predictions:
        return {"error": "Could not extract any frames. The video might be too short or in an unsupported format."}

    # Aggregate results.
    avg_fake_prob = sum(predictions) / len(predictions)
    verdict = "FAKE" if avg_fake_prob > Config.PREDICTION_THRESHOLD else "REAL"
    confidence_score = avg_fake_prob * 100 if verdict == "FAKE" else (1 - avg_fake_prob) * 100
    
    analysis_breakdown = generate_analysis_breakdown(confidence_score, verdict == "FAKE")
    
    return {
        "prediction": verdict, 
        "confidence": f"{confidence_score:.2f}",
        "breakdown": analysis_breakdown
    }

# --- API Endpoints ---
@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({"status": "TrueFrame AI Engine is running"}), 200

@app.route('/api/predict', methods=['POST'])
def handle_prediction():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    filename = secure_filename(file.filename)
    logging.info(f"Received file for prediction: {filename}")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = os.path.join(temp_dir, filename)
        file.save(temp_path)
        result = analyze_video_frames(temp_path)
        return jsonify(result)

# --- Main Runner ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT)