#!/bin/sh
set -e

# Ensure SQLite volume directory exists and has correct nextjs ownership
mkdir -p /app/prisma
chown -R nextjs:nodejs /app/prisma

# Sync schema with SQLite database using embedded local Prisma CLI
if [ -f "./node_modules/prisma/build/index.js" ]; then
  su-exec nextjs node ./node_modules/prisma/build/index.js db push --accept-data-loss
fi

# Start Next.js standalone server as non-root nextjs user
exec su-exec nextjs node server.js
