import express from 'express';
import {
  startScraper,
  stopScraper,
  getScraperStatus,
  sampleStrainsForAudit,
} from '../controllers/scraperController.js';

const router = express.Router();

// POST /pipeline/scraper/start
router.post('/start', async (req, res) => {
  try {
    const result = await startScraper();
    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
});

// POST /pipeline/scraper/stop
router.post('/stop', async (req, res) => {
  try {
    const result = await stopScraper();
    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
});

// GET /pipeline/scraper/status
router.get('/status', (req, res) => {
  try {
    const status = getScraperStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to get scraper status',
      details: err.message,
    });
  }
});


export default router;
