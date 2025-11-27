#!/bin/bash

# Script to:
# - upload email templates to the email-templates bucket
# Called by db script - assumes we're in supabase/ directory

set -e  # Exit on any error

# Source environment variables
source .env

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Uploading email templates to the email-templates bucket..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="

# Loop through all .html files in the seed/email-templates directory
for filepath in ./seed/email-templates/*.html; do
    # Extract just the filename from the full path (e.g., "template.html")
    filename=$(basename "$filepath")
    
    # Use curl to get ONLY the HTTP status code from the local storage server
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "${API_EXTERNAL_URL}/storage/v1/object/public/email-templates/${filename}" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "apikey: ${ANON_KEY}")

    # If the file is not found (status 404), then upload it
    if [ "${HTTP_STATUS}" -eq 404 ] || [ "${HTTP_STATUS}" -eq 400 ]; then
        echo "--> Uploading ${filename}..."
        curl -s -o /dev/null -X POST "${API_EXTERNAL_URL}/storage/v1/object/email-templates/${filename}" \
            --data-binary "@${filepath}" \
            -H "apikey: ${ANON_KEY}" \
            -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
            -H "Content-Type: text/html"
        else
        echo "--> ${filename} already exists (Status: ${HTTP_STATUS}). Skipping."
    fi
done