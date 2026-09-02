# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS builder
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN --mount=type=cache,target=/root/.cache/prisma \
    npx prisma generate

RUN npm run build

FROM node:20-alpine AS production
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache openssl
RUN --mount=type=cache,target=/root/.npm \
    npm install -g tsx
WORKDIR /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/prisma ./prisma

USER node
EXPOSE 3004

CMD ["sh", "-c", "npx prisma migrate deploy && tsx prisma/seed.ts && node dist/src/main"]
