#!/bin/bash
cd /Users/christophercook/Desktop/strainspotter-web
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE | xargs)
fi
echo "Starting scraper..."
node tools/image_scraper_v2.mjs 2>&1 | head -100
