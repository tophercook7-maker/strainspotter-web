#!/bin/bash
# =====================================================
# STRAINSPOTTER — MASTER START SCRIPT
# =====================================================

cd ~/Desktop/strainspotter-web || exit 1

echo "🚀 Starting StrainSpotter AI pipeline..."
echo ""

# Create logs directory
mkdir -p logs

# Check for existing processes
echo "🔍 Checking for existing processes..."
EXISTING=$(ps aux | grep -E "pipeline-control/server|image_scraper_v2|verify_vault|watch_training" | grep -v grep | wc -l | tr -d ' ')

if [ "$EXISTING" -gt 0 ]; then
  echo "⚠️  Found $EXISTING existing process(es)"
  read -p "Kill existing processes and restart? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Cleaning up old processes..."
    pkill -f "pipeline-control/server.js" 2>/dev/null || true
    pkill -f "image_scraper_v2.mjs" 2>/dev/null || true
    pkill -f "verify_vault.mjs" 2>/dev/null || true
    pkill -f "watch_training.mjs" 2>/dev/null || true
    sleep 2
  else
    echo "❌ Aborted. Existing processes left running."
    exit 1
  fi
fi

# Start dashboard API
echo "📡 Starting dashboard API..."
nohup node pipeline-control/server.js > logs/dashboard_api.log 2>&1 &
DASHBOARD_PID=$!
echo "   Dashboard API started (PID: $DASHBOARD_PID)"

sleep 2

# Start scraper
echo "🔄 Starting image scraper..."
nohup node tools/image_scraper_v2.mjs > logs/scraper.log 2>&1 &
SCRAPER_PID=$!
echo "   Scraper started (PID: $SCRAPER_PID)"

sleep 2

# Start vault watcher (if script exists)
if [ -f "tools/verify_vault.mjs" ]; then
  echo "📦 Starting vault watcher..."
  nohup node tools/verify_vault.mjs --watch > logs/vault_watch.log 2>&1 &
  VAULT_PID=$!
  echo "   Vault watcher started (PID: $VAULT_PID)"
else
  echo "⚠️  Vault watcher script not found (skipping)"
fi

sleep 2

# Start training monitor (background, logs to file)
echo "🧠 Starting training monitor (background)..."
nohup node ml-training/monitor/watch_training.mjs > logs/training_monitor.log 2>&1 &
MONITOR_PID=$!
echo "   Training monitor started (PID: $MONITOR_PID)"

sleep 2

echo ""
echo "✅ All systems started"
echo ""
echo "📊 Services:"
echo "  • Dashboard API: http://localhost:3333/api/pipeline/state"
echo "  • Training Monitor: http://localhost:3333/training-monitor"
echo "  • Scraper: Running (PID: $SCRAPER_PID)"
echo "  • Vault Watcher: Running (PID: $VAULT_PID)"
echo ""
echo "📋 Logs:"
echo "  • Dashboard: tail -f logs/dashboard_api.log"
echo "  • Scraper: tail -f logs/scraper.log"
echo "  • Vault: tail -f logs/vault_watch.log"
echo "  • Monitor: tail -f logs/training_monitor.log"
echo ""
echo "🛑 To stop all: ./stop_pipeline.sh"
echo "   Or: pkill -f 'pipeline-control/server|image_scraper_v2|verify_vault|watch_training'"
