import express from 'express';
import { sampleStrainsForAudit } from '../controllers/scraperController.js';

const router = express.Router();

// GET /pipeline/audit/random?count=1|3
router.get('/random', (req, res) => {
  try {
    const count = parseInt(req.query.count || '1', 10);
    if (count !== 1 && count !== 3) {
      return res.status(400).json({
        error: 'count must be 1 or 3',
      });
    }

    const samples = sampleStrainsForAudit(count);
    res.json({
      samples,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to sample strains for audit',
      details: err.message,
    });
  }
});

export default router;
