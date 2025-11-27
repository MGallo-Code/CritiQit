#!/bin/bash

# Script to:
# - reset the information in the database (NOT VOLUMES/STORAGE)
# Called by db script - assumes we're in supabase/ directory

set -e  # Exit on any error

# Source environment variables
source .env

echo "Resetting database..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
supabase db reset --db-url "${DB_URL}" --yes --debug

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Database reset process completed!"