#!/bin/bash
SCRAPER_FILE="tools/image_scraper_v2.mjs"
LOG_FILE="scrape.log"

while true; do
  echo "🔁 Starting scraper at $(date)" | tee -a "$LOG_FILE"
  node "$SCRAPER_FILE" >> "$LOG_FILE" 2>&1
  EXIT_CODE=$?
  echo "💥 Scraper exited with code $EXIT_CODE at $(date), restarting in 10s" | tee -a "$LOG_FILE"
  sleep 10
done
