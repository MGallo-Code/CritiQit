#!/bin/bash

# Supabase Storage Restore Script
# Usage: ./restore-storage.sh [backup-file.tar.gz]

if [ $# -eq 0 ]; then
    echo "📋 Available backups:"
    ls -la ./backups/storage-backup-*.tar.gz 2>/dev/null || echo "No backup files found"
    echo ""
    echo "Usage: $0 <backup-file.tar.gz>"
    echo "Example: $0 backups/storage-backup-20250817_143000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restoring Supabase storage from: $BACKUP_FILE"
echo "⚠️  This will overwrite current storage data. Continue? (y/N)"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# Stop storage service
echo "⏹️  Stopping storage service..."
docker compose stop storage

# Clear current volume
echo "🗑️  Clearing current volume..."
docker run --rm -v supabase_supabase-storage-data:/data alpine sh -c "rm -rf /data/*"

# Extract backup to volume
echo "📦 Restoring from backup..."
docker run --rm -v supabase_supabase-storage-data:/data -v "$(pwd):/backup" alpine sh -c "cd /data && tar -xzf /backup/$BACKUP_FILE"

# Start storage service
echo "▶️  Starting storage service..."
docker compose start storage

echo "✅ Restore completed successfully!"
