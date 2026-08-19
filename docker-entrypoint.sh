#!/bin/sh
set -e

# Ensure uploads directory and prisma directories exist with proper read/write permissions
mkdir -p /app/uploads
mkdir -p /app/prisma
chown -R nextjs:nodejs /app/uploads /app/prisma 2>/dev/null || true
chmod -R 777 /app/uploads /app/prisma 2>/dev/null || true

# Execute CMD passed to entrypoint or default to node server.js
if [ "$#" -gt 0 ]; then
  exec su-exec nextjs "$@"
else
  echo "Starting WAYAPP application server on port ${PORT:-3000}..."
  exec su-exec nextjs node server.js
fi
