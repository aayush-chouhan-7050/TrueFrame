const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const PYTHON_API_URL = 'https://trueframe-backend.onrender.com/api/predict'; // Updated endpoint

// --- Middleware Setup ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Configure Multer for temporary file storage
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// --- API Route for File Uploads ---
app.post('/upload', upload.single('video'), async (req, res) => {
  // Check if a file was actually uploaded
  if (!req.file) {
    console.error('Upload attempt with no file.');
    return res.status(400).json({ error: 'No video file was uploaded.' });
  }

  const videoPath = req.file.path;
  console.log(`🎬 Received file: ${req.file.originalname}. Stored temporarily at ${videoPath}`);

  try {
    // Create a new FormData instance to forward the file
    const formData = new FormData();
    formData.append('file', fs.createReadStream(videoPath), req.file.originalname);

    console.log('📡 Forwarding to Python AI Engine...');

    // Post the file to the Python backend
    const response = await axios.post(PYTHON_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ Received analysis from AI Engine:', response.data);

    // Send the AI's response back to the client
    return res.json(response.data);

  } catch (error) {
    console.error('❌ Error communicating with Python API:', error.message);
    const errorMessage = error.response?.data?.error || 'The AI analysis engine is currently unavailable.';
    return res.status(500).json({ error: errorMessage });

  } finally {
    // --- Cleanup ---
    // Always delete the temporary file from the 'uploads' directory
    fs.unlink(videoPath, (err) => {
      if (err) {
        console.error('Error deleting temporary file:', videoPath, err);
      } else {
        console.log(`🗑️ Cleaned up temporary file: ${videoPath}`);
      }
    });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🖥️ TrueFrame frontend server is live on http://localhost:${PORT}`);
});