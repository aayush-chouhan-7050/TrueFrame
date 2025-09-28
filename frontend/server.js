// Import required packages
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Load environment variables from .env file
require('dotenv').config();

// --- App Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_API_URL = process.env.PYTHON_API_URL;
const UPLOADS_DIR = path.join(__dirname, 'uploads/');

// --- Pre-flight Checks ---
if (!PYTHON_API_URL) {
  console.error("FATAL ERROR: PYTHON_API_URL is not defined in the .env file.");
  process.exit(1); // Exit the application
}

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files like index.html

// Configure Multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });


// --- API Route for File Uploads ---
app.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    console.error('Upload error: No file was provided in the request.');
    return res.status(400).json({ error: 'No video file was uploaded.' });
  }

  const videoPath = req.file.path;
  console.log(`🎬 Received file: ${req.file.originalname}. Stored at: ${videoPath}`);

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(videoPath), req.file.originalname);

    console.log(`📡 Forwarding file to AI Engine at ${PYTHON_API_URL}...`);

    const response = await axios.post(PYTHON_API_URL, formData, {
      headers: formData.getHeaders(),
    });

    console.log('✅ AI Engine responded successfully.');
    return res.json(response.data);

  } catch (error) {
    console.error('❌ Error communicating with Python AI Engine.');
    
    let errorMessage = 'The AI analysis engine is currently unavailable.';
    let statusCode = 500;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error Data:', error.response.data);
      console.error('Error Status:', error.response.status);
      errorMessage = error.response.data.error || `AI engine returned status ${error.response.status}.`;
      statusCode = error.response.status;
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from AI engine:', error.request);
      errorMessage = 'No response from the AI analysis engine. It may be offline.';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Axios setup error:', error.message);
    }
    
    return res.status(statusCode).json({ error: errorMessage });

  } finally {
    // Clean up the uploaded file
    fs.unlink(videoPath, (err) => {
      if (err) {
        console.error(`Error deleting temporary file: ${videoPath}`, err);
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