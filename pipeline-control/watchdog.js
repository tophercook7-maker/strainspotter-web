import { loadState, updateState } from "./state.js";
import fs from "fs";
import { join } from "path";

const STATE = join(process.cwd(), "pipeline-control", "state.json");
const MAX_IDLE_MS = 120000; // 2 minutes (120 seconds)

setInterval(() => {
  try {
    if (!fs.existsSync(STATE)) return;
    
    const s = JSON.parse(fs.readFileSync(STATE, "utf8"));
    const heartbeat = s.lastHeartbeat || s.last_heartbeat;
    
    if (!heartbeat) return;

    const age = Date.now() - new Date(heartbeat).getTime();

    if (age > MAX_IDLE_MS && (s.status === "running" || s.status === "harvesting")) {
      console.error("❌ SCRAPER STALLED — NO HEARTBEAT");
      s.status = "stalled";
      s.lastError = s.lastError || "No heartbeat detected for 120 seconds";
      s.last_error = s.lastError;
      fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
    }
  } catch (error) {
    console.error("❌ Watchdog error:", error.message);
  }
}, 30000); // Check every 30 seconds
