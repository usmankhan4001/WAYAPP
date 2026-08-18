#!/bin/sh
set -e

# Ensure uploads directory exists with proper permissions
mkdir -p /app/uploads
mkdir -p /app/prisma
chown -R nextjs:nodejs /app/uploads /app/prisma

# If using PostgreSQL, deploy migrations
if echo "$DATABASE_URL" | grep -q "postgres"; then
  echo "PostgreSQL database detected. Running Prisma schema deployment..."
  npx prisma db push --skip-generate || true
fi

# If using SQLite, ensure template database exists
if [ ! -s "/app/prisma/dev.db" ] && [ -f "/app/prisma/template.db" ]; then
  echo "Initializing SQLite database from template..."
  cp -f /app/prisma/template.db /app/prisma/dev.db
  chown nextjs:nodejs /app/prisma/dev.db
fi

# Execute CMD passed to entrypoint or default to node server.js
if [ "$#" -gt 0 ]; then
  exec su-exec nextjs "$@"
else
  echo "Starting WAYAPP application server..."
  exec su-exec nextjs node server.js
fi
