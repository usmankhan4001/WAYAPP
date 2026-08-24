#!/usr/bin/env bash

# Setup cron job to run backup twice a day (2 AM and 2 PM)
CRON_JOB="0 2,14 * * * cd $(pwd) && ./backup-to-r2.sh >> backup.log 2>&1"

(crontab -l 2>/dev/null | grep -v "backup-to-r2.sh"; echo "$CRON_JOB") | crontab -

echo "✅ Scheduled twice-daily backups to R2 (2:00 AM and 2:00 PM)."
