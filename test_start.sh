#!/bin/bash
cd /Users/christophercook/Desktop/strainspotter-web
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE | xargs)
fi
echo "Testing scraper start..."
nohup node tools/image_scraper_v2.mjs >> vault_scrape.log 2>&1 &
SCRAPER_PID=$!
echo "Scraper PID: $SCRAPER_PID"
sleep 2
if ps -p $SCRAPER_PID > /dev/null; then
  echo "✓ Scraper is running (PID: $SCRAPER_PID)"
else
  echo "✗ Scraper exited immediately"
  tail -20 vault_scrape.log
fi
