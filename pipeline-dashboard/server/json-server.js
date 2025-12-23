import express from 'express';
import { getPipelineStatus } from './status.js';

const app = express();
const PORT = 5190;

app.get('/pipeline/status', (_req, res) => {
  try {
    res.json(getPipelineStatus());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Pipeline status failed',
      details: String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `[Pipeline Dashboard] JSON endpoint on http://localhost:${PORT}/pipeline/status`,
  );
});
