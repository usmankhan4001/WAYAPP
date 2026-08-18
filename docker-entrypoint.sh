#!/bin/sh
set -e

# Ensure SQLite volume directory exists with proper nextjs user ownership
mkdir -p /app/prisma
chown -R nextjs:nodejs /app/prisma

# Auto-initialize fresh SQLite volumes from pre-built template
if [ ! -f "/app/prisma/dev.db" ] && [ -f "/app/prisma/template.db" ]; then
  echo "Initializing SQLite database at /app/prisma/dev.db from pre-built template..."
  cp /app/prisma/template.db /app/prisma/dev.db
  chown nextjs:nodejs /app/prisma/dev.db
fi

# Ensure existing database has correct write permissions for nextjs user
if [ -f "/app/prisma/dev.db" ]; then
  chown nextjs:nodejs /app/prisma/dev.db
fi

echo "Starting WAYAPP standalone server on port 3000..."
exec su-exec nextjs node server.js
