import express from 'express';
import { getVaultStatus } from '../readers/vaultStatus.js';
import { getScraperState } from '../readers/scraperState.js';
import { getHeroStatus } from '../readers/heroStatus.js';
import { getFilesystemStatus } from '../readers/filesystem.js';

const router = express.Router();

router.get('/status', async (_req, res) => {
  try {
    const vault = getVaultStatus();
    const scraper = getScraperState();
    const heroes = getHeroStatus();
    const filesystem = getFilesystemStatus();

    res.json({
      vault,
      scraper,
      heroes,
      filesystem,
      lastUpdated: new Date().toISOString(),
      controls: {
        start: 'POST /pipeline/scraper/start',
        stop: 'POST /pipeline/scraper/stop',
        status: 'GET /pipeline/scraper/status'
      }
    });
  } catch (err) {
    console.error('[pipeline-dashboard] status error', err);
    res.status(500).json({
      error: 'Failed to read pipeline status',
      details: String(err)
    });
  }
});

export default router;
