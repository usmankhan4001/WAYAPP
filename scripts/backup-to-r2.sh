#!/usr/bin/env bash
set -eo pipefail

echo "Starting WAYAPP R2 Backup..."

# Require environment variables
if [ -z "$R2_ACCOUNT_ID" ] || [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ] || [ -z "$R2_BUCKET_NAME" ] || [ -z "$ENCRYPTION_KEY" ]; then
  echo "Error: Missing required R2 or Encryption environment variables."
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="wayapp_backup_${TIMESTAMP}.sql.gz.enc"

# Use Docker to run AWS CLI to avoid needing it installed on the host
# We stream pg_dump from the postgres container -> gzip -> encrypt -> R2

docker exec wayapp-postgres pg_dump -U wayapp -d wayapp -Fc \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -k "${ENCRYPTION_KEY}" \
  | docker run --rm -i \
      -e AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
      -e AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
      amazon/aws-cli \
      s3 cp - "s3://${R2_BUCKET_NAME}/backups/${FILENAME}" \
      --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
      --region auto

echo "✅ Encrypted backup successfully uploaded to R2: ${FILENAME}"
