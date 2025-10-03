#!/bin/sh
set -e

# Install postgresql-client if not already installed
if ! command -v pg_isready > /dev/null 2>&1; then
  echo "Installing postgresql-client..."
  apk add --no-cache postgresql-client
fi

# Wait until Postgres is ready
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  echo "Waiting for Postgres..."
  sleep 2
done

# Run migrations
if [ -f yarn.lock ]; then
  yarn drizzle-kit migrate
elif [ -f package-lock.json ]; then
  npm run db:migrate
elif [ -f pnpm-lock.yaml ]; then
  corepack enable pnpm && pnpm run db:migrate
fi

# Start the app
exec "$@"
