#!/usr/bin/env node

/**
 * STRAINSPOTTER — PIPELINE DASHBOARD TRUTH SOURCE
 *
 * This makes the dashboard read EXACTLY what the scraper writes.
 * No guessing. No fake "running".
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const STATE_PATH = path.resolve(ROOT, "pipeline-control", "state.json");

// ---------- HARD GUARD ----------
if (!fs.existsSync(STATE_PATH)) {
  console.error("❌ STATE FILE MISSING:", STATE_PATH);
  process.exit(1);
}

// ---------- READ STATE ----------
export function readPipelineState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const state = JSON.parse(raw);

    return {
      status: state.status || "idle",
      phase: state.phase || "init",
      currentQuery: state.currentQuery || null,
      queryIndex: state.queryIndex || 0,
      totalQueries: state.totalQueries || 0,
      imagesFound: state.imagesFound || 0,
      lastHeartbeat: state.lastHeartbeat || null,
      lastError: state.lastError || null,
      watchdog: state.watchdog || "inactive",
      lastUpdate: state.lastUpdate || state.lastHeartbeat || null,
    };
  } catch (err) {
    console.error("❌ DASHBOARD STATE READ FAILED:", err);
    return {
      status: "error",
      phase: "error",
      currentQuery: null,
      queryIndex: 0,
      totalQueries: 0,
      imagesFound: 0,
      lastHeartbeat: null,
      lastError: "state.json unreadable",
      watchdog: "inactive",
      lastUpdate: null,
    };
  }
}

// ---------- DEV TEST ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const state = readPipelineState();
  console.log("📊 PIPELINE STATE SNAPSHOT");
  console.log(JSON.stringify(state, null, 2));
}

