#!/bin/bash

# Script to:
# - upload preset avatar images to the avatars bucket under presets/ folder
# Run from the supabase/seed/ directory or supabase/ directory

set -e  # Exit on any error

# Change to supabase directory if we're in seed/
if [ -f "../compose.yml" ]; then
    cd ..
fi

source .env

# Check if we're in the right directory
if [ ! -f "compose.yml" ]; then
    echo "❌ Error: Please run this script from the supabase/ directory"
    exit 1
fi

cd seed

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Uploading preset avatars to the avatars/presets/ folder..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="

# Loop through all .jpg files in the avatar-presets directory
for filepath in ./avatar-presets/*.jpg; do
    # Skip if no .jpg files exist (glob doesn't match)
    if [ ! -f "$filepath" ]; then
        echo "⚠️  No .jpg files found in avatar-presets/ directory"
        exit 0
    fi

    # Extract just the filename from the full path (e.g., "avatar-1.jpg")
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
            -H "Content-Type: image/jpeg"
        else
        echo "--> ${filename} already exists (Status: ${HTTP_STATUS}). Skipping."
    fi
done

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Preset avatar upload process completed!"
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
