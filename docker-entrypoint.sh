#!/bin/sh
set -e

# Wait for postgres to be ready
echo "Waiting for postgres..."
while ! nc -z postgres 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Create database if it doesn't exist
# I think this was erasing my db
# PGPASSWORD=postgres psql -h postgres -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'app'" | grep -q 1 || PGPASSWORD=postgres psql -h postgres -U postgres -c "CREATE DATABASE app"

# Run migrations
if [ -f yarn.lock ]; then
  yarn drizzle-kit migrate
elif [ -f package-lock.json ]; then
  npm run db:migrate
elif [ -f pnpm-lock.yaml ]; then
  corepack enable pnpm && pnpm run db:migrate
else
  npm run db:migrate
fi

# Start the app
exec "$@"
