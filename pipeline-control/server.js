/**********************************************************************
 * FILE: pipeline-control/server.js
 * PURPOSE: Expose live scraper state to dashboard UI
 **********************************************************************/

import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3333;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const STATE_PATH = path.resolve(
  process.cwd(),
  "pipeline-control/state.json"
);

const TRAINING_STATE_PATH = path.resolve(
  process.cwd(),
  "ml-training/training_state.json"
);

const SCANNER_STATE_PATH = path.resolve(
  process.cwd(),
  "ml-training/scanner_state.json"
);

app.get("/api/pipeline/state", (req, res) => {
  if (!fs.existsSync(STATE_PATH)) {
    return res.json({
      running: false,
      note: "state.json missing"
    });
  }

  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  res.json(state);
});

// =============================
// TRAINING PROGRESS ENDPOINT
// =============================
app.get("/api/training/state", (req, res) => {
  if (!fs.existsSync(TRAINING_STATE_PATH)) {
    return res.json({ status: "missing" });
  }

  res.json(JSON.parse(fs.readFileSync(TRAINING_STATE_PATH, "utf8")));
});

// =============================
// SCANNER CONFIDENCE ENDPOINT
// =============================
app.get("/api/scanner/state", (req, res) => {
  if (!fs.existsSync(SCANNER_STATE_PATH)) {
    return res.json({ status: "missing" });
  }

  res.json(JSON.parse(fs.readFileSync(SCANNER_STATE_PATH, "utf8")));
});

// =============================
// SERVE HTML DASHBOARD
// =============================
app.get("/training-monitor", (req, res) => {
  const htmlPath = path.resolve(
    process.cwd(),
    "pipeline-control/training_monitor.html"
  );
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send("Dashboard not found");
  }
});

app.listen(PORT, () => {
  console.log(`📡 Pipeline dashboard API running on :${PORT}`);
  console.log(`📊 Training monitor: http://localhost:${PORT}/training-monitor`);
});
