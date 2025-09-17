import os
import tempfile
import torch
import torch.nn as nn
from torchvision import models, transforms
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import cv2
from PIL import Image

# --- App Initialization ---
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB upload limit

# --- Model Loading ---
print("🚀 Initializing TrueFrame AI Engine...")
device = torch.device("cpu")
MODEL_PATH = 'deepfake_detector_best_model.pth'
class_names = ['fake', 'real']

# --- Define Model Architecture ---
model = models.efficientnet_b0(weights=None)  # Load architecture without pretrained weights
num_features = model.classifier[1].in_features
model.classifier[1] = nn.Linear(num_features, len(class_names))

if not os.path.exists(MODEL_PATH):
    print(f"❌ FATAL: Model weights file not found at '{MODEL_PATH}'")
    exit()

try:
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()  # Set model to evaluation mode
    print("✅ AI Engine loaded and ready.")
except Exception as e:
    print(f"❌ FATAL: Error loading model weights: {e}")
    exit()

# --- Image Transformations ---
inference_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# --- Core Prediction Logic ---
def analyze_video_frames(video_path, frame_interval=30):
    """Extracts frames from a video, runs inference, and aggregates results."""
    predictions = []
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Cannot open video file. It may be corrupt."}

    frame_count = 0
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_count % frame_interval == 0:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                image_tensor = inference_transforms(pil_image).unsqueeze(0).to(device)
                with torch.no_grad():
                    outputs = model(image_tensor)
                    probabilities = torch.nn.functional.softmax(outputs, dim=1)
                    confidence, pred_idx = torch.max(probabilities, 1)
                    predictions.append(pred_idx.item())
            frame_count += 1
    finally:
        cap.release()

    if not predictions:
        return {"error": "Could not extract any frames. The video might be too short or in an unsupported format."}

    fake_count = predictions.count(class_names.index('fake'))
    total_valid_frames = len(predictions)
    fake_percentage = (fake_count / total_valid_frames) * 100

    verdict = "FAKE" if fake_percentage > 50 else "REAL"
    confidence_score = fake_percentage if verdict == "FAKE" else 100 - fake_percentage

    return {"prediction": verdict, "confidence": f"{confidence_score:.2f}"}

# --- API Endpoints ---
@app.route('/api/status', methods=['GET'])
def get_status():
    """A simple endpoint to check if the API is running."""
    return jsonify({"status": "TrueFrame AI Engine is running"}), 200

@app.route('/api/predict', methods=['POST'])
def handle_prediction():
    """Handles the video upload and returns the prediction."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file:
        filename = secure_filename(file.filename)
        # Use a temporary directory for safer file handling
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = os.path.join(temp_dir, filename)
            file.save(temp_path)
            
            print(f"🔬 Analyzing file: {filename}")
            result = analyze_video_frames(temp_path)
            print(f"📊 Analysis complete. Verdict: {result.get('prediction')}")
            
            return jsonify(result)

    return jsonify({"error": "An unknown error occurred"}), 500

# --- Main Runner ---
if __name__ == '__main__':
    # The backend API will run on port 5001
    app.run(host='0.0.0.0', port=5001)