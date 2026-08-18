#!/bin/sh
set -e

# Run Prisma schema migration/sync to ensure database tables are created on fresh volume
npx prisma db push --skip-generate

# Start the standalone Next.js server
exec node server.js
