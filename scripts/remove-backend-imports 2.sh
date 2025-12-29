#!/bin/bash
# Remove backend and data-pipeline imports from API routes
# Replace with "not available" error responses

set -e

echo "🔧 Removing backend/data-pipeline imports from API routes..."

# List of files that need fixing
FILES=(
  "app/api/vault/agents/run-now/route.ts"
  "app/api/vault/agents/start/route.ts"
  "app/api/vault/agents/stop/route.ts"
  "app/api/vault/agents/status/route.ts"
  "app/api/admin/auto-grow/run/route.ts"
  "app/api/cron/community-summaries/route.ts"
)

# For now, we'll handle these manually
echo "⚠️  Manual fixes needed for vault/admin routes"
echo "These routes reference backend code and should return 503 errors"
