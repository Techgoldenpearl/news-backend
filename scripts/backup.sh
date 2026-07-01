#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="$BACKUP_DIR/news_platform_$TIMESTAMP.dump"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "[Backup] Starting database backup..."
pg_dump -Fc "$DATABASE_URL" > "$BACKUP_FILE"
echo "[Backup] Created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

if [ -n "${S3_BUCKET:-}" ] && [ -n "${S3_ENDPOINT:-}" ]; then
  echo "[Backup] Uploading to S3..."
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/$(basename $BACKUP_FILE)" \
    --endpoint-url "$S3_ENDPOINT" 2>/dev/null && echo "[Backup] Uploaded to S3" || echo "[Backup] S3 upload failed"
fi

echo "[Backup] Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

echo "[Backup] Done!"
