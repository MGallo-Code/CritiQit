#!/bin/bash

# Script to delete all email templates from the email-templates bucket
# Called by db script - assumes we're in supabase/ directory

set -e  # Exit on any error

# Source environment variables
source .env

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Cleaning email templates from email-templates bucket..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="

# Get list of all files in email-templates bucket
FILES=$(curl -s -X POST "${API_EXTERNAL_URL}/storage/v1/object/list/email-templates" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}' | \
    grep -o '"name":"[^"]*"' | \
    sed 's/"name":"//g' | \
    sed 's/"//g' || echo "")

if [ -z "$FILES" ]; then
    echo "ℹ️  No template files found to clean"
    echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
    exit 0
fi

# Count files
FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "Found $FILE_COUNT template file(s) to delete"
echo ""

# Delete each file
echo "$FILES" | while read -r filepath; do
    if [ -n "$filepath" ]; then
        echo "--> Deleting ${filepath}..."
        curl -s -o /dev/null -X DELETE "${API_EXTERNAL_URL}/storage/v1/object/email-templates/${filepath}" \
            -H "apikey: ${ANON_KEY}" \
            -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
    fi
done

echo ""
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Email template cleanup completed!"
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
