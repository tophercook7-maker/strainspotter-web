#!/bin/bash
# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE | xargs)
fi

SCRAPER_FILE="tools/image_scraper_v2.mjs"
LOG_FILE="pipeline.log"

echo "🌙 Starting overnight pipeline at $(date)" | tee -a "$LOG_FILE"

while true; do
  echo "🌙 Pipeline tick $(date)" | tee -a "$LOG_FILE"
  node "$SCRAPER_FILE" >> "$LOG_FILE" 2>&1
  EXIT_CODE=$?
  echo "💥 Pipeline exited with code $EXIT_CODE at $(date), restarting in 60s" | tee -a "$LOG_FILE"
  sleep 60
done
