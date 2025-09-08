#!/bin/bash

# Script to clear the Supabase database
# Run from the supabase/ directory

set -e  # Exit on any error

source .env

# Check if we're in the right directory
if [ ! -f "compose.yml" ]; then
    echo "❌ Error: Please run this script from the supabase/ directory"
    exit 1
fi

echo "Starting database reset process..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="

cd ..

supabase db reset --db-url "${DB_URL}" --yes

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Database reset process completed!"

cd supabase