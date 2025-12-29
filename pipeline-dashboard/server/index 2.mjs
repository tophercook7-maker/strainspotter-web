import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import statusRoute from './api/status.js';
import auditRoute from './api/audit.js';
import {
  startScraper,
  stopScraper,
  isRunning
} from './scraperController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5190;

// JSON body parsing
app.use(express.json());

// API
app.use('/api/pipeline', statusRoute);
app.use('/pipeline/audit', auditRoute);

// Scraper controls
app.post('/pipeline/scraper/start', (_req, res) => {
  try {
    const pid = startScraper();
    res.json({ started: true, pid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/pipeline/scraper/stop', (_req, res) => {
  try {
    const pid = stopScraper();
    res.json({ stopped: true, pid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/pipeline/scraper/status', (_req, res) => {
  res.json({
    running: isRunning()
  });
});

// Static frontend
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`[Pipeline Dashboard] running at http://localhost:${PORT}`);
});
