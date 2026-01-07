import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const STATE_PATH = path.resolve(
  process.cwd(),
  "pipeline-control/state.json"
);

const SCRAPER_CMD = [
  "node",
  ["tools/image_scraper_v2.mjs"]
];

const STALL_TIMEOUT_MS = 1000 * 60 * 5; // 5 minutes
let scraperProcess = null;

function readState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function writeState(update) {
  const prev = readState() || {};
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      { ...prev, ...update, lastUpdate: new Date().toISOString() },
      null,
      2
    )
  );
}

function startScraper(reason = "manual") {
  console.log("🚀 Starting scraper:", reason);

  writeState({
    running: true,
    note: `scraper started (${reason})`
  });

  scraperProcess = spawn(SCRAPER_CMD[0], SCRAPER_CMD[1], {
    stdio: "inherit"
  });

  scraperProcess.on("exit", (code) => {
    console.log("❌ Scraper exited with code", code);
    writeState({
      running: false,
      note: `scraper exited (code ${code})`
    });
    scraperProcess = null;
  });
}

function checkStall() {
  const state = readState();
  if (!state || !state.running) return;

  const last = new Date(state.lastUpdate || 0).getTime();
  const now = Date.now();

  if (now - last > STALL_TIMEOUT_MS) {
    console.log("⚠️ STALL DETECTED — restarting scraper");

    writeState({
      running: false,
      note: "stall detected — restarting"
    });

    if (scraperProcess) {
      scraperProcess.kill("SIGKILL");
      scraperProcess = null;
    }

    startScraper("stall-recovery");
  }
}

// START
console.log("🛡️ Pipeline Watchdog Started");

startScraper("boot");

setInterval(checkStall, 30_000);
