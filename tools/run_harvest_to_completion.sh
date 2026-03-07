#!/usr/bin/env bash
# Run the image scraper until harvesting is complete.
# Restarts automatically if the process exits before completion (crash or interrupt).
# Usage: from repo root, run:  bash tools/run_harvest_to_completion.sh

set -e
cd "$(dirname "$0")/.."

echo "Stopping any existing scraper..."
pkill -f "image_scraper_v2.mjs" 2>/dev/null || true
sleep 2

while true; do
  echo ""
  echo "Starting harvest (no limit – will run until all 4000 queries are done)..."
  node tools/image_scraper_v2.mjs || echo "Scraper exited (will check state and restart if needed)"

  # Check if harvesting is complete
  if node -e "
    const fs = require('fs');
    const p = 'scraper_state.json';
    if (!fs.existsSync(p)) process.exit(1);
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    process.exit(s.harvesting_complete ? 0 : 1);
  " 2>/dev/null; then
    echo ""
    echo "Harvest complete. Exiting."
    exit 0
  fi

  echo "Harvest not complete. Restarting in 5s..."
  sleep 5
done
