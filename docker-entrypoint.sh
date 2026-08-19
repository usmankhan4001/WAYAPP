#!/bin/sh
set -e

# Ensure uploads directory exists with proper read/write permissions
mkdir -p /app/uploads
chown -R nextjs:nodejs /app/uploads 2>/dev/null || true
chmod -R 777 /app/uploads 2>/dev/null || true

# Generate Prisma Client to ensure client matches environment database provider
echo "Generating Prisma Client..."
su-exec nextjs /app/node_modules/.bin/prisma generate

# Apply database migrations (no-op when already applied).
# Never `db push` in production — schema is owned by prisma/migrations.
echo "Applying database migrations..."
su-exec nextjs /app/node_modules/.bin/prisma migrate deploy

# Optional explicit seed on first run (requires ADMIN_PASSWORD + --force in prod)
if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database (RUN_SEED=true)..."
  su-exec nextjs /app/node_modules/.bin/tsx prisma/seed.ts --force
fi

# Execute CMD passed to entrypoint or default to node server.js
if [ "$#" -gt 0 ]; then
  exec su-exec nextjs "$@"
else
  echo "Starting WAYAPP application server on port ${PORT:-3000}..."
  exec su-exec nextjs node server.js
fi
