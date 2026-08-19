#!/bin/sh

# Ensure uploads directory exists
mkdir -p /app/uploads
chmod -R 777 /app/uploads 2>/dev/null || true

echo "Checking PostgreSQL connection..."
# Wait for PostgreSQL to become reachable
for i in $(seq 1 20); do
  echo "Attempt $i/20: Checking database readiness..."
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

echo "Applying database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning: check migration logs"

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database (RUN_SEED=true)..."
  npx tsx prisma/seed.ts --force 2>&1 || echo "Seed warning: check seed logs"
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
else
  echo "Starting WAYAPP application server on port ${PORT:-3000}..."
  exec node server.js
fi
