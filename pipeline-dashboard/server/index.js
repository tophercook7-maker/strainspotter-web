import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import statusRoute from './api/status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5190;

// API
app.use('/api/pipeline', statusRoute);

// Static frontend
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`[Pipeline Dashboard] running at http://localhost:${PORT}`);
});
