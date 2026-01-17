// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory:', uploadsDir);
}

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Use disk storage to ensure filename extensions are kept
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (!ext) {
      // Default to m4a if client gives no extension
      ext = '.m4a';
    }
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

// Init OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to transcribe audio file using Whisper
async function transcribeFile(filePath) {
  const fileStream = fs.createReadStream(filePath);

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
  });

  return response.text;
}

// Root health-check endpoint
app.get('/', (req, res) => {
  res.send('Speech server running');
});

// ───────────────────────────────────────────
// POST /transcribe-details
// ───────────────────────────────────────────
app.post('/transcribe-details', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    console.log('[/transcribe-details] Uploaded file:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });

    const filePath = path.resolve(req.file.path);
    const text = await transcribeFile(filePath);

    // cleanup
    fs.unlink(filePath, () => {});

    res.json({ text });
  } catch (err) {
    console.error(
      'Error in /transcribe-details:',
      err.response?.data || err.message || err
    );
    res.status(500).json({
      error: 'Transcription failed',
      detail: err.response?.data || err.message || String(err),
    });
  }
});

// ───────────────────────────────────────────
// POST /transcribe-notes
// ───────────────────────────────────────────
app.post('/transcribe-notes', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    console.log('[/transcribe-notes] Uploaded file:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });

    const filePath = path.resolve(req.file.path);
    const text = await transcribeFile(filePath);

    // cleanup
    fs.unlink(filePath, () => {});

    res.json({ text });
  } catch (err) {
    console.error(
      'Error in /transcribe-notes:',
      err.response?.data || err.message || err
    );
    res.status(500).json({
      error: 'Transcription failed',
      detail: err.response?.data || err.message || String(err),
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Speech server listening on port ${port}`);
});
