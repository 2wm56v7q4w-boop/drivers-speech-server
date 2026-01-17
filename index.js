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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());

const upload = multer({ dest: 'uploads/' });

async function transcribeFile(filePath) {
  const fileStream = fs.createReadStream(filePath);

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
    // language: 'en', // optional
  });

  return response.text;
}

// ➜ For details (customer/address/product/quantity)
app.post('/transcribe-details', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.resolve(req.file.path);
    const text = await transcribeFile(filePath);

    fs.unlink(filePath, () => {});

    res.json({ text });
  } catch (err) {
    console.error('Error in /transcribe-details:', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// ➜ For notes
app.post('/transcribe-notes', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.resolve(req.file.path);
    const text = await transcribeFile(filePath);

    fs.unlink(filePath, () => {});

    res.json({ text });
  } catch (err) {
    console.error('Error in /transcribe-notes:', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

app.get('/', (req, res) => {
  res.send('Speech server running');
});

app.listen(port, () => {
  console.log(`Speech server listening on port ${port}`);
});
