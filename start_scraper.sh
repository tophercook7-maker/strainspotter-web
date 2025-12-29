#!/bin/bash
cd ~/Desktop/strainspotter-web || exit 1

mkdir -p logs

echo "🧹 Cleaning old processes"
pkill -f image_scraper_v2 || true

echo "🚀 Starting scraper"
node tools/image_scraper_v2.mjs >> logs/scraper.log 2>&1 &

SCRAPER_PID=$!
echo "🧠 Scraper PID: $SCRAPER_PID"

echo "🫀 Watchdog active"
while true; do
  sleep 30
  if ! kill -0 $SCRAPER_PID 2>/dev/null; then
    echo "🔥 Scraper crashed — restarting"
    node tools/image_scraper_v2.mjs >> logs/scraper.log 2>&1 &
    SCRAPER_PID=$!
  fi
done

