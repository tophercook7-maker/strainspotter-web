import fs from "fs";
import path from "path";

const STATE_PATH = path.resolve(
  process.cwd(),
  "pipeline-control/state.json"
);

export function readPipelineState() {
  if (!fs.existsSync(STATE_PATH)) {
    return {
      running: false,
      strains: 0,
      images: 0,
      currentQuery: "missing state.json",
      note: "state file not found",
      lastUpdate: null
    };
  }

  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch (err) {
    return {
      running: false,
      strains: 0,
      images: 0,
      currentQuery: "state parse error",
      note: err.message,
      lastUpdate: null
    };
  }
}
