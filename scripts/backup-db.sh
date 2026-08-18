#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/wayapp_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Starting PostgreSQL backup for WAYAPP to ${BACKUP_FILE}..."

if [ -n "${DATABASE_URL}" ]; then
  pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
else
  docker exec -t wayapp-postgres pg_dump -U wayapp -d wayapp | gzip > "${BACKUP_FILE}"
fi

echo "✅ Backup successfully created at ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
