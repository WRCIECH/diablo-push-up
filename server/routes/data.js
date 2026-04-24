const express = require('express');
const path = require('path');
const router = express.Router();

const ALLOWED = ['items', 'monsters', 'push_ups', 'locations'];

router.get('/:name', (req, res) => {
  const { name } = req.params;
  if (!ALLOWED.includes(name)) return res.status(404).json({ error: 'Not found' });
  res.json(require(path.join(__dirname, '..', 'data', `${name}.json`)));
});

module.exports = router;
