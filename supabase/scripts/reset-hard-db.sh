#!/bin/bash

# Script to:
# - clear the Supabase database,
# - apply migrations
# - seed the database
# - restart the database
# Called by db script - assumes we're in supabase/ directory

# Check for the --seed flag
if [ "$1" == "--no-seed" ]; then
    SEED=false
else
    SEED=true
fi

set -e  # Exit on any error

# Source environment variables
source .env

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
    ./scripts/upload-templates.sh
fi

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Database reset process completed!"