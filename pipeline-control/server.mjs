import express from "express";
import fs from "fs";

const app = express();

app.get("/api/scraper", (_, res) =>
  res.json(JSON.parse(fs.readFileSync("pipeline-control/state.json", "utf8")))
);

app.get("/api/training", (_, res) =>
  res.json(JSON.parse(fs.readFileSync("ml-training/state/training_state.json", "utf8")))
);

app.listen(3333, () => console.log("📊 Dashboard API running on :3333"));

