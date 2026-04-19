#!/bin/bash
# Setup script to configure Tauri for remote UI loading

set -e

echo "🔧 Configuring Tauri for remote UI loading..."

# Check if REMOTE_URL is set
if [ -z "$REMOTE_URL" ]; then
    echo "⚠️  REMOTE_URL not set. Using default: https://app.strainspotter.app"
    REMOTE_URL="https://app.strainspotter.app"
fi

echo "📡 Remote URL: $REMOTE_URL"

# Update tauri.conf.json with remote URL
if [ -f "src-tauri/tauri.conf.json" ]; then
    # Use jq if available, otherwise use sed
    if command -v jq &> /dev/null; then
        jq --arg url "$REMOTE_URL" '.build.frontendDist = $url' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
        mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
        echo "✅ Updated tauri.conf.json with remote URL using jq"
    else
        # Fallback to sed (less reliable but works)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|\"frontendDist\": \".*\"|\"frontendDist\": \"$REMOTE_URL\"|g" src-tauri/tauri.conf.json
        else
            # Linux
            sed -i "s|\"frontendDist\": \".*\"|\"frontendDist\": \"$REMOTE_URL\"|g" src-tauri/tauri.conf.json
        fi
        echo "✅ Updated tauri.conf.json with remote URL using sed"
    fi
else
    echo "❌ tauri.conf.json not found."
    exit 1
fi

echo "✅ Tauri remote configuration complete!"
echo ""
echo "To build with remote UI:"
echo "  REMOTE_URL=https://your-domain.com npm run tauri:build"
