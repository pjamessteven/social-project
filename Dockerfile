# Make sure it uses up to date node js version
FROM node:23-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ linux-headers
# If you still run into build issue, go to "Problem #3: Making /app is read only.
# in case you have permission issues.
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found. Installing dependencies using npm install..." && npm install; \
  fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_STANDALONE=true

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found. Building with npm..." && npm run build; \
  fi


FROM base AS runner
WORKDIR /app

# Install postgresql-client, netcat, and python3 for database operations and yt-dlp
RUN apk add --no-cache postgresql-client netcat-openbsd python3 ffmpeg yt-dlp

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_STANDALONE=true

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy application code with appropriate ownership and permissions
COPY --from=builder --chown=nextjs:nodejs --chmod=555 /app/public ./public
COPY --from=builder --chown=nextjs:nodejs --chmod=555 /app/components ./components
COPY --from=builder --chown=nextjs:nodejs --chmod=555 /app/db ./db
COPY --from=builder --chown=nextjs:nodejs --chmod=555 /app/app ./app
COPY --from=builder --chown=nextjs:nodejs --chmod=555 /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs --chmod=555 /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs --chmod=444 /app/drizzle.config.ts ./drizzle.config.ts

# Copy dependencies and build output with execution permissions
COPY --from=builder --chown=nextjs:nodejs --chmod=755 /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs --chmod=755 /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs --chmod=755 /app/.next/standalone ./

COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]

CMD ["node", "server.js"]
