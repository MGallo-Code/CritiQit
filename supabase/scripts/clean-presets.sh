#!/bin/bash

# Script to delete all preset avatar images from the avatars/presets/ folder
# Called by db script - assumes we're in supabase/ directory

set -e  # Exit on any error

# Source environment variables
source .env

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Cleaning preset avatars from avatars/presets/ folder..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="

# Get list of all files in presets folder using direct object list
FILES=$(curl -s -X POST "${API_EXTERNAL_URL}/storage/v1/object/list/avatars" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"prefix":"presets/"}' | \
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

# Delete each file (prepend presets/ to filename)
echo "$FILES" | while read -r filename; do
    if [ -n "$filename" ]; then
        filepath="presets/${filename}"
        echo "--> Deleting ${filepath}..."
        curl -s -o /dev/null -X DELETE "${API_EXTERNAL_URL}/storage/v1/object/avatars/${filepath}" \
            -H "apikey: ${ANON_KEY}" \
            -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
    fi
done

echo ""
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Preset avatar cleanup completed!"
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
