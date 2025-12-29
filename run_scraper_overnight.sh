#!/bin/bash
SCRAPER_FILE="tools/image_scraper_v2.mjs"
LOG_FILE="vault_scrape.log"

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE | xargs)
fi

echo "🚀 Starting overnight scraper daemon at $(date)" | tee -a "$LOG_FILE"

while true; do
  echo "🔁 Scraper tick $(date)" | tee -a "$LOG_FILE"
  node "$SCRAPER_FILE" >> "$LOG_FILE" 2>&1
  EXIT_CODE=$?
  echo "💥 Scraper exited with code $EXIT_CODE at $(date), restarting in 30s" | tee -a "$LOG_FILE"
  sleep 30
done
