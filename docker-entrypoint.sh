#!/bin/sh
set -e

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
