#!/bin/bash
# ================================
# STRAINSPOTTER — FULL PIPELINE BOOT
# ================================

cd ~/Desktop/strainspotter-web || exit 1

echo "🔍 Checking for existing processes..."
EXISTING=$(ps aux | grep -E "pipeline-control/server|image_scraper_v2" | grep -v grep | wc -l | tr -d ' ')

if [ "$EXISTING" -gt 0 ]; then
  echo "⚠️  Found $EXISTING existing process(es)"
  read -p "Kill existing processes and restart? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Cleaning up old processes..."
    pkill -f "pipeline-control/server.js" 2>/dev/null || true
    pkill -f "image_scraper_v2.mjs" 2>/dev/null || true
    sleep 2
  else
    echo "❌ Aborted. Existing processes left running."
    exit 1
  fi
fi

echo ""
echo "🚀 Starting Pipeline Dashboard API..."
mkdir -p logs
nohup node pipeline-control/server.js > logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "  Dashboard PID: $DASHBOARD_PID"

sleep 2

echo ""
echo "🧠 Starting Image Scraper..."
nohup node tools/image_scraper_v2.mjs > logs/scraper.log 2>&1 &
SCRAPER_PID=$!
echo "  Scraper PID: $SCRAPER_PID"

sleep 3

echo ""
echo "✅ Pipeline started!"
echo ""
echo "📊 Verifying services..."
sleep 2

if curl -s http://localhost:3333/api/pipeline/state > /dev/null 2>&1; then
  echo "✅ Dashboard API: Running"
  curl -s http://localhost:3333/api/pipeline/state | jq '{
    status: (if .running then "RUNNING ✅" else "IDLE ⏸️" end),
    progress: "\(.queriesCompleted // .processed_queries // .strains // 0) / \(.totalQueries // .total_queries // 35794)",
    images: .images,
    currentQuery: .currentQuery
  }'
else
  echo "⚠️  Dashboard API: Not responding yet (may need a few more seconds)"
fi

echo ""
echo "📋 Process Management:"
echo "  • View dashboard logs: tail -f logs/dashboard.log"
echo "  • View scraper logs: tail -f logs/scraper.log"
echo "  • Stop dashboard: kill $DASHBOARD_PID"
echo "  • Stop scraper: kill $SCRAPER_PID"
echo "  • Stop all: pkill -f 'pipeline-control/server|image_scraper_v2'"
echo ""
echo "📊 Live monitoring:"
echo "  • Watch state: watch -n 10 'curl -s http://localhost:3333/api/pipeline/state | jq'"
echo "  • Or use: node tools/verify_vault.mjs --watch"
echo ""

