#!/bin/sh

# Ensure uploads directory exists
mkdir -p /app/uploads
chmod -R 777 /app/uploads 2>/dev/null || true

echo "Regenerating Prisma client for runtime environment..."
node ./node_modules/prisma/build/index.js generate --schema=./prisma/schema.prisma 2>/dev/null || npx prisma generate --schema=./prisma/schema.prisma 2>/dev/null || true

if [ -d "/app/node_modules/.prisma" ]; then
  mkdir -p /app/.next/server/node_modules 2>/dev/null || true
  cp -rf /app/node_modules/.prisma /app/.next/server/node_modules/ 2>/dev/null || true
  cp -rf /app/node_modules/.prisma /app/node_modules/@prisma/client/ 2>/dev/null || true
fi

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

echo "Applying database schema & migrations safely..."
node ./node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --skip-generate || node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma || npx prisma db push --schema=./prisma/schema.prisma --skip-generate || true

echo "Seeding database with default settings and admin credentials..."
node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts --force || npx tsx prisma/seed.ts --force || echo "Seed complete"

if [ "$#" -gt 0 ]; then
  exec "$@"
else
  # The background worker (outbound-webhook forwards, scheduled campaigns, the stuck-
  # campaign sweeper, counter reconciliation) must run somewhere. docker-compose runs
  # it as its own service and sets WORKER_EMBEDDED=off on web; a single-container
  # deployment such as Dokploy has no such service, so by default it runs here beside
  # the web server, restarted if it crashes. Without it every queued webhook stayed
  # PENDING forever while /api/health still reported the worker as running.
  if [ "${WORKER_EMBEDDED:-on}" != "off" ]; then
    echo "Starting embedded background worker..."
    ( while true; do
        node ./node_modules/tsx/dist/cli.mjs src/worker/index.ts
        echo "[worker] exited with code $? - restarting in 5s"
        sleep 5
      done ) &
  fi

  echo "Starting WAYAPP application server on port ${PORT:-3000}..."
  exec node server.js
fi
