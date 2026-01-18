// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');

// ----- SETUP UPLOADS FOLDER -----
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory:', uploadsDir);
}

// ----- EXPRESS APP -----
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ----- MULTER STORAGE (keeps a proper extension) -----
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (!ext) {
      // if client didn’t give an extension, default to .m4a
      ext = '.m4a';
    }
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

// ----- OPENAI CLIENT -----
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to call Whisper
async function transcribeFile(filePath) {
  const fileStream = fs.createReadStream(filePath);

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
  });

  return response.text;
}

// ----- HEALTH CHECK -----
app.get('/', (req, res) => {
  res.send('Speech server running');
});

// ----- /transcribe-details -----
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
      uploadsDir,
    });

    const filePath = path.join(uploadsDir, req.file.filename);
    const text = await transcribeFile(filePath);

    // delete temp file
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

// ----- /transcribe-notes -----
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
      uploadsDir,
    });

    const filePath = path.join(uploadsDir, req.file.filename);
    const text = await transcribeFile(filePath);

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

// ----- START SERVER -----
app.listen(port, () => {
  console.log(`Speech server listening on port ${port}`);
});
