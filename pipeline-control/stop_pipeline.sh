#!/bin/bash
# ================================
# STRAINSPOTTER — STOP PIPELINE
# ================================

cd ~/Desktop/strainspotter-web || exit 1

echo "🛑 Stopping Pipeline..."

echo "  • Stopping Dashboard API..."
pkill -f "pipeline-control/server.js" && echo "    ✅ Stopped" || echo "    ⚠️  Not running"

echo "  • Stopping Image Scraper..."
pkill -f "image_scraper_v2.mjs" && echo "    ✅ Stopped" || echo "    ⚠️  Not running"

sleep 1

echo ""
echo "✅ Pipeline stopped!"
echo ""
echo "📊 Final state:"
if [ -f pipeline-control/state.json ]; then
  cat pipeline-control/state.json | jq '{running, strains, images, lastUpdate}'
fi

