#!/usr/bin/env bash
set -eo pipefail

if [ -z "$1" ]; then
  echo "Usage: ./restore-from-r2.sh <filename.sql.gz.enc>"
  exit 1
fi

if [ -z "$R2_ACCOUNT_ID" ] || [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ] || [ -z "$R2_BUCKET_NAME" ] || [ -z "$ENCRYPTION_KEY" ]; then
  echo "Error: Missing required R2 or Encryption environment variables."
  exit 1
fi

FILENAME=$1
echo "Starting restore from R2: ${FILENAME}"
echo "WARNING: THIS WILL OVERWRITE THE CURRENT DATABASE! Press Ctrl+C in the next 5 seconds to abort."
sleep 5

docker run --rm -i \
    -e AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    -e AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    amazon/aws-cli \
    s3 cp "s3://${R2_BUCKET_NAME}/backups/${FILENAME}" - \
    --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
    --region auto \
  | openssl enc -d -aes-256-cbc -pbkdf2 -k "${ENCRYPTION_KEY}" \
  | gunzip \
  | docker exec -i wayapp-postgres pg_restore -U wayapp -d wayapp --clean --if-exists

echo "✅ Database successfully restored from R2 backup."
