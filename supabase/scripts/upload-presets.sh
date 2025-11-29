#!/bin/bash

# Script to upload preset avatar images to the avatars bucket under presets/ folder
# Called by db script - assumes we're in supabase/ directory

set -e  # Exit on any error

# Source environment variables
source .env

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Uploading preset avatars to the avatars/presets/ folder..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="

# Loop through all .png files in the seed/avatar-presets directory
for filepath in ./seed/avatar-presets/*.png; do
    # Skip if no .png files exist (glob doesn't match)
    if [ ! -f "$filepath" ]; then
        echo "⚠️  No .png files found in avatar-presets/ directory"
        exit 0
    fi

    # Extract just the filename from the full path (e.g., "t-rex.png")
    filename=$(basename "$filepath")

    # Use curl to get ONLY the HTTP status code from the local storage server
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "${API_EXTERNAL_URL}/storage/v1/object/public/avatars/presets/${filename}" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "apikey: ${ANON_KEY}")

    # If the file is not found (status 404), then upload it
    if [ "${HTTP_STATUS}" -eq 404 ] || [ "${HTTP_STATUS}" -eq 400 ]; then
        echo "--> Uploading ${filename}..."
        curl -s -o /dev/null -X POST "${API_EXTERNAL_URL}/storage/v1/object/avatars/presets/${filename}" \
            --data-binary "@${filepath}" \
            -H "apikey: ${ANON_KEY}" \
            -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
            -H "Content-Type: image/png"
        else
        echo "--> ${filename} already exists (Status: ${HTTP_STATUS}). Skipping."
    fi
done

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Preset avatar upload process completed!"
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
