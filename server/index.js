const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const stateRouter = require('./routes/state');
const dataRouter  = require('./routes/data');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', stateRouter);
app.use('/api/data', dataRouter);

// Serve audio files from AUDIO_DIR env var (Railway volume) or local public folder.
// In dev, Vite serves public/ directly so this route is never hit.
// In production, set AUDIO_DIR to wherever the MP3s live on the volume (e.g. /data).
const audioDir = process.env.AUDIO_DIR
  ? path.resolve(process.env.AUDIO_DIR)
  : path.join(__dirname, '..', 'client', 'public', 'audio');
app.use('/audio', express.static(audioDir));

// Serve built React client in production
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Diablo Push-Up server running on port ${PORT}`);
});
