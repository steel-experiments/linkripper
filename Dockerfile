# ABOUTME: Multi-stage Docker build for the LINKRIPPER Next.js app.
# ABOUTME: Produces a lean standalone server image with native deps prebuilt.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data

# Standalone server + static assets. better-sqlite3 and sharp are traced in by
# Next's standalone output since they're listed as serverExternalPackages.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p /data
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
