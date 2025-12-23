#!/bin/bash

# Setup script for Community Intelligence weekly cron job
# This will add a cron job to run every Monday at 2 AM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Setting up Community Intelligence cron job..."
echo ""
echo "This will add a cron job to run every Monday at 2 AM"
echo "Project directory: $PROJECT_DIR"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "generate-community-summaries"; then
  echo "⚠️  Cron job already exists!"
  echo ""
  echo "Current cron jobs:"
  crontab -l 2>/dev/null | grep "generate-community-summaries"
  echo ""
  read -p "Do you want to replace it? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
  # Remove existing entry
  crontab -l 2>/dev/null | grep -v "generate-community-summaries" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "0 2 * * 1 cd $PROJECT_DIR && npm run generate-community-summaries >> $PROJECT_DIR/logs/community-intelligence.log 2>&1") | crontab -

echo "✅ Cron job added!"
echo ""
echo "Schedule: Every Monday at 2:00 AM"
echo "Command: cd $PROJECT_DIR && npm run generate-community-summaries"
echo "Logs: $PROJECT_DIR/logs/community-intelligence.log"
echo ""
echo "To view your cron jobs: crontab -l"
echo "To remove this cron job: crontab -e (then delete the line)"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

echo "✅ Setup complete!"
