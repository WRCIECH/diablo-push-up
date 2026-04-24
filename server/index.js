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
