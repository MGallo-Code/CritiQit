#!/bin/bash

# Generate Avatar Preset Spritesheet
# Combines source PNGs into a single spritesheet for efficient loading
# Requires: ImageMagick (brew install imagemagick)
#
# Usage: npm run sprites
#
# Source: assets/avatar-presets/*.png
# Output: public/avatars/presets.png + presets.json

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

# Configuration
FRAME_SIZE=512  # Square frames for circular avatar display
SOURCE_DIR="${FRONTEND_DIR}/assets/avatar-presets"
OUTPUT_DIR="${FRONTEND_DIR}/public/avatars"
TEMP_DIR="${OUTPUT_DIR}/.temp-resized"
SPRITESHEET="${OUTPUT_DIR}/presets.png"
METADATA="${OUTPUT_DIR}/presets.json"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check for ImageMagick
if ! command -v magick &> /dev/null; then
    echo -e "${RED}❌ ImageMagick not found. Install with: brew install imagemagick${NC}"
    exit 1
fi

# Check source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ Source directory not found: $SOURCE_DIR${NC}"
    exit 1
fi

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Get list of PNG files
PNG_FILES=($(ls -1 "$SOURCE_DIR"/*.png 2>/dev/null | sort))
COUNT=${#PNG_FILES[@]}

if [ $COUNT -eq 0 ]; then
    echo -e "${RED}❌ No PNG files found in $SOURCE_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${BLUE}  Generating Avatar Spritesheet${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

# Create temp directory for resized images
mkdir -p "$TEMP_DIR"
trap "rm -rf '$TEMP_DIR'" EXIT

# Resize all images to standard size
echo -e "Normalizing ${COUNT} images to ${FRAME_SIZE}x${FRAME_SIZE}..."
RESIZED_FILES=()
for file in "${PNG_FILES[@]}"; do
    FILENAME=$(basename "$file")
    RESIZED="${TEMP_DIR}/${FILENAME}"

    # Resize to fit within frame, centered on transparent background
    magick "$file" \
        -resize "${FRAME_SIZE}x${FRAME_SIZE}" \
        -gravity center \
        -background transparent \
        -extent "${FRAME_SIZE}x${FRAME_SIZE}" \
        "$RESIZED"

    RESIZED_FILES+=("$RESIZED")
    echo "  ✓ $FILENAME"
done

echo ""
echo "Creating spritesheet..."

# Create horizontal sprite sheet (all images in a row)
magick montage "${RESIZED_FILES[@]}" \
    -tile "${COUNT}x1" \
    -geometry "${FRAME_SIZE}x${FRAME_SIZE}+0+0" \
    -background transparent \
    "$SPRITESHEET"

echo -e "  ${GREEN}✓${NC} ${SPRITESHEET}"

# Generate metadata JSON file
cat > "$METADATA" << EOF
{
  "generatedAt": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "frameWidth": $FRAME_SIZE,
  "frameHeight": $FRAME_SIZE,
  "frameCount": $COUNT,
  "totalWidth": $((FRAME_SIZE * COUNT)),
  "layout": "horizontal",
  "frames": [
EOF

# Add each file to the frames array
INDEX=0
for file in "${PNG_FILES[@]}"; do
    FILENAME=$(basename "$file" .png)
    if [ $INDEX -gt 0 ]; then
        echo "," >> "$METADATA"
    fi
    echo -n "    {\"index\": $INDEX, \"id\": \"$FILENAME\", \"name\": \"$FILENAME\"}" >> "$METADATA"
    ((INDEX++))
done

# Close JSON structure
cat >> "$METADATA" << EOF

  ]
}
EOF

echo -e "  ${GREEN}✓${NC} ${METADATA}"

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Spritesheet generated successfully!${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "To add new presets:"
echo "  1. Add PNG to assets/avatar-presets/"
echo "  2. Run: npm run sprites"
echo "  3. Update lib/avatar-presets.ts with new entry"
echo ""
