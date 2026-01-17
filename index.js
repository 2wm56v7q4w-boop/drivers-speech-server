// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Allow your mobile app to call this API
app.use(cors());
app.use(express.json());

// Handle file uploads to /uploads
const upload = multer({ dest: 'uploads/' });

// Init OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper to transcribe with Whisper
async function transcribeFile(filePath) {
  const fileStream = fs.createReadStream(filePath);

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1'
  });

  return response.text;
}

// Test endpoint for deployment health
app.get('/', (req, res) => {
  res.send('Speech server running');
});

// ────────────────────────────────────────────
//  POST /transcribe-details
// ────────────────────────────────────────────
app.post('/transcribe-details', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    console.log('[/transcribe-details] Uploaded file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const filePath = path.resolve(req.file.path);
    const text = await transcribeFile(filePath);

    // Delete temp file
    fs.unlink(filePath, () => {});

    res.json({ text });
  } catch (err) {
    console.error('Error in /transcribe-details:', err.response?.data || err.message || err);
    res.status(500).json({
      error: 'Transcription failed',
      detail: err.response?.data || err.message || String(err)
    });
  }
});

// ────────────────────────────────────────────
//  POST /transcribe-notes
// ────────────────────────────────────────────
app.post('/transcribe-notes', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    console.log('[/transcribe-notes] Uploaded file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const filePath = path.resolve(req.file.path);
    const text = await transcribeFile(filePath);

    fs.unlink(filePath, () => {});

    res.json({ text });
  } catch (err) {
    console.error('Error in /transcribe-notes:', err.response?.data || err.message || err);
    res.status(500).json({
      error: 'Transcription failed',
      detail: err.response?.data || err.message || String(err)
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Speech server listening on port ${port}`);
});
