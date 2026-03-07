import fs from "fs";

const STATE = "pipeline-control/state.json";
let lastRender = 0;

function render() {
  if (!fs.existsSync(STATE)) return;

  const now = Date.now();
  if (now - lastRender < 2000) return; // throttle to 2s
  lastRender = now;

  console.clear();
  const s = JSON.parse(fs.readFileSync(STATE, "utf8"));

  console.log("🧠 STRAINSPOTTER TRAINING MONITOR");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");
  console.log("📦 VAULT STATUS");
  console.log(`  • Images: ${s.images}`);
  console.log(`  • Strains: ${s.strains}`);
  console.log("");
  console.log("🧠 TRAINING STATUS");
  console.log(`  • Status: ${s.status}`);
  console.log(`  • Phase: ${s.phase}`);
  console.log(`  • Dataset size: ${s.datasetSize ?? "warming"}`);
  console.log(`  • Note: ${s.note ?? ""}`);
  console.log("");
  console.log("⏰ Time:", new Date().toLocaleTimeString());
}

setInterval(render, 2000);
