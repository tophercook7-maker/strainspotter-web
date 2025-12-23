import express from 'express';
import { startScraper, stopScraper, isRunning } from '../scraperController.js';

const router = express.Router();

router.post('/start', (_req, res) => {
  try {
    const pid = startScraper();
    res.json({ started: true, pid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/stop', (_req, res) => {
  try {
    const pid = stopScraper();
    res.json({ stopped: true, pid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/status', (_req, res) => {
  res.json({
    running: isRunning()
  });
});

export default router;
