#!/bin/bash
# Generate iOS emblem sizes from hero_master_1536.png

SOURCE="public/emblem/hero_master_1536.png"
TARGET_DIR="../ios/StrainSpotter/Assets.xcassets/StrainSpotterEmblem.imageset"

if [ ! -f "$SOURCE" ]; then
  echo "❌ Error: $SOURCE not found"
  echo "Please place hero_master_1536.png in public/emblem/"
  exit 1
fi

echo "✅ Found master image: $SOURCE"
echo "📐 Generating scaled versions..."

# Generate 1x (512x512)
sips -z 512 512 "$SOURCE" --out "$TARGET_DIR/StrainSpotterEmblem.png"
echo "✅ Created 1x: StrainSpotterEmblem.png (512×512)"

# Generate 2x (1024x1024)
sips -z 1024 1024 "$SOURCE" --out "$TARGET_DIR/StrainSpotterEmblem@2x.png"
echo "✅ Created 2x: StrainSpotterEmblem@2x.png (1024×1024)"

# Generate 3x (1536x1536) - use original if it's 1536, otherwise resize
sips -g pixelWidth "$SOURCE" | grep -q "pixelWidth: 1536" && cp "$SOURCE" "$TARGET_DIR/StrainSpotterEmblem@3x.png" || sips -z 1536 1536 "$SOURCE" --out "$TARGET_DIR/StrainSpotterEmblem@3x.png"
echo "✅ Created 3x: StrainSpotterEmblem@3x.png (1536×1536)"

echo ""
echo "✅ All iOS emblem sizes generated!"
echo "📦 Files created in: $TARGET_DIR"
