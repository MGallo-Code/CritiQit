#!/bin/bash

# Supabase Storage Backup Script
# This script backs up the Docker volume to organized archives

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="storage-backup-$TIMESTAMP"

echo "🗄️  Starting Supabase storage backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create a direct backup from Docker volume (skip the sync folder mess)
echo "📦 Creating backup archive directly from Docker volume..."
docker run --rm \
  -v supabase_supabase-storage-data:/data:ro \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine tar -czf "/backup/$BACKUP_NAME.tar.gz" -C /data .

# Keep only the last 5 backups
echo "🧹 Cleaning up old backups (keeping last 5)..."
cd "$BACKUP_DIR"
ls -t storage-backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f
cd ..

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "📊 Backup size: $(du -h $BACKUP_DIR/$BACKUP_NAME.tar.gz | cut -f1)"
echo "📁 Backup location: $BACKUP_DIR/"

# Show what's backed up
echo "📋 Backed up files:"
docker run --rm -v supabase_supabase-storage-data:/data:ro alpine find /data -name "*.jpeg" -o -name "*.png" -o -name "*.webp" | head -5
echo "   (and more...)"
