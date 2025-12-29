#!/bin/bash
# Build desktop installers for private tester distribution
# Generates macOS .dmg and Windows .msi

set -e

echo "🔨 Building StrainSpotter Desktop Installers..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src-tauri" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

# Set environment variables
export DESKTOP_TEST_BUILD=true
export NEXT_PUBLIC_DESKTOP_TEST_BUILD=true
export DESKTOP_VERSION=DESKTOP_TEST_v1

# Allow override of remote URL (defaults to app.strainspotter.app)
# For local testing: DESKTOP_REMOTE_URL=http://localhost:3000 npm run tauri:build:test
# For production: DESKTOP_REMOTE_URL=https://app.strainspotter.app npm run tauri:build:test
export DESKTOP_REMOTE_URL=${DESKTOP_REMOTE_URL:-"https://app.strainspotter.app"}

echo "📦 Build Configuration:"
echo "  - Test Build: $DESKTOP_TEST_BUILD"
echo "  - Version: $DESKTOP_VERSION"
echo ""

# Update Tauri config with remote URL
if [ -f "src-tauri/tauri.conf.json" ]; then
    if command -v jq &> /dev/null; then
        jq --arg url "$DESKTOP_REMOTE_URL" '.build.frontendDist = $url' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
        mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
        echo "✅ Updated frontendDist to: $DESKTOP_REMOTE_URL"
    else
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|\"frontendDist\": \".*\"|\"frontendDist\": \"$DESKTOP_REMOTE_URL\"|g" src-tauri/tauri.conf.json
        else
            sed -i "s|\"frontendDist\": \".*\"|\"frontendDist\": \"$DESKTOP_REMOTE_URL\"|g" src-tauri/tauri.conf.json
        fi
        echo "✅ Updated frontendDist to: $DESKTOP_REMOTE_URL"
    fi
fi

# Note: For remote UI loading, we don't need to build Next.js
# The app will load from the remote URL (frontendDist)
# If using localhost, make sure npm run dev is running!

# Build Tauri app
echo ""
echo "🔨 Building Tauri app (remote UI loading from: $DESKTOP_REMOTE_URL)..."
npm run tauri:build

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Installers:"
echo "  macOS: src-tauri/target/release/bundle/macos/StrainSpotter.app"
echo "  macOS DMG: src-tauri/target/release/bundle/dmg/"
echo "  Windows: src-tauri/target/release/bundle/msi/"
echo ""
echo "📋 Next steps:"
echo "  1. Test installers on clean machines"
echo "  2. Verify auto-update works"
echo "  3. Verify remote UI loading"
echo "  4. Distribute to testers"
