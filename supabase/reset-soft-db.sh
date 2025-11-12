#!/bin/bash

# Script to:
# - reset the information in the database (NOT VOLUMES/STORAGE)
# Run from the supabase/ directory

set -e  # Exit on any error

source .env

# Check if we're in the right directory
if [ ! -f "compose.yml" ]; then
    echo "❌ Error: Please run this script from the supabase/ directory"
    exit 1
fi

echo "Resetting database..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
supabase db reset --db-url "${DB_URL}" --yes --debug

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Database reset process completed!"