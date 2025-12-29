#!/bin/bash
# =====================================================
# STRAINSPOTTER — STOP ALL PIPELINE SERVICES
# =====================================================

cd ~/Desktop/strainspotter-web || exit 1

echo "🛑 Stopping StrainSpotter pipeline..."
echo ""

echo "  • Stopping Dashboard API..."
pkill -f "pipeline-control/server.js" && echo "    ✅ Stopped" || echo "    ⚠️  Not running"

echo "  • Stopping Scraper..."
pkill -f "image_scraper_v2.mjs" && echo "    ✅ Stopped" || echo "    ⚠️  Not running"

echo "  • Stopping Vault Watcher..."
pkill -f "verify_vault.mjs" && echo "    ✅ Stopped" || echo "    ⚠️  Not running"

echo "  • Stopping Training Monitor..."
pkill -f "watch_training.mjs" && echo "    ✅ Stopped" || echo "    ⚠️  Not running"

sleep 1

echo ""
echo "✅ Pipeline stopped!"
echo ""
echo "📊 Final state:"
if [ -f pipeline-control/state.json ]; then
  cat pipeline-control/state.json | jq '{running, strains, images, lastUpdate}' 2>/dev/null || echo "  (state.json exists)"
fi
