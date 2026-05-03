# syntax=docker/dockerfile:1.6
# Gateway microservice: thin NestJS proxy.
# Smallest of the four — tens of MB — but still benefits from the npm
# cache mount (re-deploy ~5 s instead of ~30 s).

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

# ── Production ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./

USER node
EXPOSE 3001
CMD ["node", "dist/main"]
