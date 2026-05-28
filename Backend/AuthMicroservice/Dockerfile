# syntax=docker/dockerfile:1.6
# Auth microservice: NestJS with Prisma.
# Cache mounts on apk, npm, and prisma engine downloads make a re-deploy
# of unchanged-deps land in ~10 s instead of ~70 s.

FROM node:25-alpine AS builder
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

# Generate Prisma client (this also pulls the prisma engine binary;
# cache the prisma cache dir so the engine isn't re-downloaded each build).
RUN --mount=type=cache,target=/root/.cache/prisma \
    npx prisma generate

RUN npm run build

# ── Production ──────────────────────────────────────────────────────────────
FROM node:25-alpine AS production
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache openssl
WORKDIR /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/prisma ./prisma

USER node
EXPOSE 3002

# tsc emits to dist/src because prisma/* sources sit beside src/ and pull
# the rootDir up to the project root. Run prisma migrate before starting
# so a fresh DB picks up the schema.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
