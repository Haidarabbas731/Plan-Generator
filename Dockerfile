# Production image: build with Bun, run the built server on Node as a non-root user.
# Local development uses Dockerfile.dev (see docker-compose.yml).

FROM oven/bun:1.4.2-debian AS build

WORKDIR /app

# Copy dependency files first to maximize Docker layer caching
COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .

RUN bun run build

# Keep only production dependencies for the runtime image
RUN rm -rf node_modules
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production


FROM node:24-bookworm-slim

WORKDIR /app

# Non-root user for security
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -s /bin/bash appuser

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/build ./build
COPY --from=build --chown=appuser:appgroup /app/drizzle ./drizzle
COPY --from=build --chown=appuser:appgroup /app/scripts ./scripts

RUN chmod +x scripts/start.sh

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/healthz').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Runs database migrations, then starts the server
CMD ["./scripts/start.sh"]
