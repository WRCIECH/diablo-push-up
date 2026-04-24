const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// DATA_DIR is set to a Railway persistent volume path in production via env var
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'gamestate.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

router.get('/state', (req, res) => {
  if (!fs.existsSync(STATE_FILE)) {
    return res.json({ exists: false });
  }
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    res.json({ exists: true, state });
  } catch {
    res.status(500).json({ error: 'Failed to read game state' });
  }
});

router.post('/state', (req, res) => {
  const { state } = req.body;
  if (!state) return res.status(400).json({ error: 'No state provided' });
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to save game state' });
  }
});

router.delete('/state', (req, res) => {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
  res.json({ success: true });
});

module.exports = router;
