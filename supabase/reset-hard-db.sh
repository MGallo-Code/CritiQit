#!/bin/bash

# Script to:
# - clear the Supabase database,
# - apply migrations
# - seed the database
# - restart the database
# Run from the supabase/ directory

# Check for the --seed flag
if [ "$1" == "--no-seed" ]; then
    SEED=false
else
    SEED=true
fi

set -e  # Exit on any error

source .env

# Check if we're in the right directory
if [ ! -f "compose.yml" ]; then
    echo "❌ Error: Please run this script from the supabase/ directory"
    exit 1
fi

echo "Stopping database..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
docker compose down -v

echo "Cleaning up volumes..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
rm -rf ./volumes/db/data

echo "Starting database..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
docker compose up -d

# Wait 10 seconds to ensure started properly
sleep 10

echo "Applying migrations..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
supabase db push --db-url "${DB_URL}" --yes --debug

if [ "$SEED" = true ]; then
    # echo "Seeding database..."
    # echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
    # supabase db seed --db-url "${DB_URL}" --yes

    # Upload email templates
    ./seed/upload-templates.sh

    # Upload preset avatars
    ./seed/upload-presets.sh
fi

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Database reset process completed!"