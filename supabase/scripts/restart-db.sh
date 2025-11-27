#!/bin/bash

# Script to restart the Supabase database
# Called by db script - assumes we're in supabase/ directory

set -e  # Exit on any error

echo "Starting database restart process..."
echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="

docker compose down

docker compose up -d

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-="
echo "Database restart process completed!"