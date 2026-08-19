#!/bin/sh

# Ensure uploads directory exists
mkdir -p /app/uploads
chmod -R 777 /app/uploads 2>/dev/null || true

echo "Checking PostgreSQL connection..."
# Wait for PostgreSQL to become reachable
for i in $(seq 1 25); do
  echo "Attempt $i/25: Checking database readiness..."
  if node -e "
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    client.connect()
      .then(() => { client.end(); process.exit(0); })
      .catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "PostgreSQL is connected and ready!"
    break
  fi
  sleep 2
done

echo "Applying database schema & migrations..."
node ./node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --accept-data-loss || node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma || npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss

echo "Seeding database with default settings and admin credentials..."
node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts --force || npx tsx prisma/seed.ts --force || echo "Seed complete"

if [ "$#" -gt 0 ]; then
  exec "$@"
else
  echo "Starting WAYAPP application server on port ${PORT:-3000}..."
  exec node server.js
fi
