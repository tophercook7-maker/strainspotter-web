#!/bin/bash

# Generate macOS iconset and .icns from StrainSpotter Emblem
# Usage: ./generate-icons.sh [source-icon.png]
#
# Source: Uses public/emblem/StrainSpotterEmblem.png (the main brand image used in scanner)
# Output: desktop/assets/icon.icns

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$DESKTOP_DIR/assets"
ICONSET_DIR="$ASSETS_DIR/icon.iconset"
PROJECT_ROOT="$(dirname "$DESKTOP_DIR")"

# Source icon (default: StrainSpotter Emblem from public, or argument)
if [ -z "$1" ]; then
  # Default: use StrainSpotter Emblem from public folder (used in scanner page)
  EMBLEM_SOURCE="$PROJECT_ROOT/public/emblem/StrainSpotterEmblem.png"
  if [ -f "$EMBLEM_SOURCE" ]; then
    # Copy and resize emblem to 1024x1024
    echo "Using StrainSpotter Emblem: $EMBLEM_SOURCE"
    sips -z 1024 1024 "$EMBLEM_SOURCE" --out "$ASSETS_DIR/icon.png" > /dev/null
    SOURCE_ICON="$ASSETS_DIR/icon.png"
  else
    SOURCE_ICON="$ASSETS_DIR/icon.png"
  fi
else
  SOURCE_ICON="$1"
fi

if [ ! -f "$SOURCE_ICON" ]; then
  echo "Error: Source icon not found: $SOURCE_ICON"
  echo "Usage: $0 [source-icon.png]"
  exit 1
fi

echo "Generating macOS iconset from: $SOURCE_ICON"

# Create iconset directory
mkdir -p "$ICONSET_DIR"

# Generate all required sizes
# Using sips (macOS built-in) for image conversion
if command -v sips &> /dev/null; then
  echo "Using sips for image conversion..."
  
  # Generate @1x and @2x sizes
  sips -z 16 16 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null
  sips -z 32 32 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null
  sips -z 32 32 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null
  sips -z 64 64 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null
  sips -z 128 128 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null
  sips -z 256 256 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null
  sips -z 256 256 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null
  sips -z 512 512 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null
  sips -z 512 512 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null
  sips -z 1024 1024 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null
  
  echo "✓ Generated all icon sizes"
else
  echo "Error: sips not found. Please install ImageMagick or use another tool."
  exit 1
fi

# Generate .icns file
echo "Generating .icns file..."
iconutil -c icns "$ICONSET_DIR" -o "$ASSETS_DIR/icon.icns"

if [ $? -eq 0 ]; then
  echo "✓ Generated: $ASSETS_DIR/icon.icns"
  echo "✓ Iconset ready for Electron"
else
  echo "Error: Failed to generate .icns file"
  exit 1
fi
