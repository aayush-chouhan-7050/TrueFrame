const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Busboy = require('busboy');

// The URL for your hosted Python backend
const PYTHON_API_URL = 'https://snickersnee-trueframe-ai-engine.hf.space/api/predict';

// Helper to parse multipart/form-data
const parseMultipartForm = (req) => {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers });
        const fields = {};
        const files = {};

        busboy.on('file', (fieldname, file, { filename, encoding, mimeType }) => {
            const saveTo = path.join(os.tmpdir(), `upload_${Date.now()}_${filename}`);
            file.pipe(fs.createWriteStream(saveTo));
            files[fieldname] = { filepath: saveTo, filename, encoding, mimeType };
        });

        busboy.on('field', (fieldname, val) => {
            fields[fieldname] = val;
        });

        busboy.on('close', () => resolve({ files, fields }));
        busboy.on('error', err => reject(err));

        // In Vercel, the request body is already available.
        busboy.end(req.body);
    });
};


// This is our Vercel Serverless Function
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let tempFilePath = '';

    try {
        const { files } = await parseMultipartForm(req);
        const videoFile = files.video; // 'video' is the field name from the frontend

        if (!videoFile) {
            return res.status(400).json({ error: 'No video file was uploaded.' });
        }

        tempFilePath = videoFile.filepath;

        // Create a new FormData instance to forward the file
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath), videoFile.filename);

        // Post the file to the Python backend
        const response = await axios.post(PYTHON_API_URL, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        // Send the AI's response back to the client
        return res.status(200).json(response.data);

    } catch (error) {
        console.error('Error communicating with Python API:', error.message);
        const errorMessage = error.response?.data?.error || 'The AI analysis engine is currently unavailable.';
        return res.status(500).json({ error: errorMessage });

    } finally {
        // Cleanup: Always delete the temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}