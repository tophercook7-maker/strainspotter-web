#!/bin/bash
# Generate Tauri app icons from brand mark SVG
# Requires: ImageMagick (brew install imagemagick)

set -e

ICON_SOURCE="public/brand/logos/botanical-logo-mark.svg"
ICON_DIR="src-tauri/icons"

echo "🎨 Generating Tauri app icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install with: brew install imagemagick"
    exit 1
fi

# Check if source exists
if [ ! -f "$ICON_SOURCE" ]; then
    echo "❌ Icon source not found: $ICON_SOURCE"
    exit 1
fi

# Create icons directory
mkdir -p "$ICON_DIR"

# Generate icons at required sizes
echo "📐 Generating icons..."

convert "$ICON_SOURCE" -resize 32x32 "$ICON_DIR/32x32.png"
convert "$ICON_SOURCE" -resize 128x128 "$ICON_DIR/128x128.png"
convert "$ICON_SOURCE" -resize 256x256 "$ICON_DIR/128x128@2x.png"
convert "$ICON_SOURCE" -resize 256x256 "$ICON_DIR/256x256.png"
convert "$ICON_SOURCE" -resize 512x512 "$ICON_DIR/256x256@2x.png"
convert "$ICON_SOURCE" -resize 512x512 "$ICON_DIR/512x512.png"
convert "$ICON_SOURCE" -resize 1024x1024 "$ICON_DIR/512x512@2x.png"

echo "✅ Icons generated in $ICON_DIR"
echo ""
echo "Required icons:"
ls -lh "$ICON_DIR"/*.png
