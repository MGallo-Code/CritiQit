#!/bin/bash

# Script to delete all preset avatar images from the avatar-presets bucket
# Called by db script - assumes we're in supabase/ directory

set -e  # Exit on any error

# Source environment variables
source .env

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Cleaning preset avatars from avatar-presets bucket..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="

# Get list of all files in avatar-presets bucket
FILES=$(curl -s -X POST "${API_EXTERNAL_URL}/storage/v1/object/list/avatar-presets" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"prefix":""}' | \
    grep -o '"name":"[^"]*"' | \
    sed 's/"name":"//g' | \
    sed 's/"//g' || echo "")

if [ -z "$FILES" ]; then
    echo "ℹ️  No preset files found to clean"
    echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
    exit 0
fi

# Count files
FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "Found $FILE_COUNT preset file(s) to delete"
echo ""

# Delete each file
echo "$FILES" | while read -r filename; do
    if [ -n "$filename" ]; then
        echo "--> Deleting ${filename}..."
        curl -s -o /dev/null -X DELETE "${API_EXTERNAL_URL}/storage/v1/object/avatar-presets/${filename}" \
            -H "apikey: ${ANON_KEY}" \
            -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
    fi
done

echo ""
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Preset avatar cleanup completed!"
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
