#!/bin/bash

# Script to restart the Supabase database
# Run from the supabase/ directory

set -e  # Exit on any error

# Check if we're in the right directory
if [ ! -f "compose.yml" ]; then
    echo "❌ Error: Please run this script from the supabase/ directory"
    exit 1
fi

echo "Starting database restart process...\n=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\n"

docker compose down

docker compose up -d

echo "\n=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\nDatabase restart process completed!"