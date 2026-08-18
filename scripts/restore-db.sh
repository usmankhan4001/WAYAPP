#!/usr/bin/env bash
set -eo pipefail

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore-db.sh <path_to_backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' does not exist."
  exit 1
fi

echo "⚠️  WARNING: Restoring will overwrite existing data in the WAYAPP database!"
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Restoring database from ${BACKUP_FILE}..."

if [ -n "${DATABASE_URL}" ]; then
  gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
else
  gunzip -c "${BACKUP_FILE}" | docker exec -i wayapp-postgres psql -U wayapp -d wayapp
fi

echo "✅ Database restore completed successfully!"
