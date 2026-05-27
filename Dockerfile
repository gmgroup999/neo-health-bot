# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build
RUN npm prune --production

# ── Runtime stage ─────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Create non-root user + data directory with correct ownership
RUN addgroup -S neo && adduser -S neo -G neo \
    && mkdir -p /app/data \
    && chown -R neo:neo /app/data

USER neo

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
