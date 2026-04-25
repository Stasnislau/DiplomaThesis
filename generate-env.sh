#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  Generates a production .env with strong random secrets.
#  Run once on the server:  bash generate-env.sh > .env
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

rand_hex()  { openssl rand -hex "$1"; }
rand_pass() { openssl rand -base64 "$1" | tr -d '/+=' | head -c "$1"; }

cat <<EOF
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Production .env — generated $(date +%Y-%m-%d)                        ║
# ║  DO NOT COMMIT THIS FILE                                       ║
# ╚══════════════════════════════════════════════════════════════════╝

# ── Database ──────────────────────────────────────────────────────
POSTGRES_USER=diploma_app
POSTGRES_PASSWORD=$(rand_pass 32)

# ── RabbitMQ ──────────────────────────────────────────────────────
RABBITMQ_USER=diploma_rmq
RABBITMQ_PASSWORD=$(rand_pass 24)

# ── Auth Service ──────────────────────────────────────────────────
JWT_SECRET=$(rand_hex 32)
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=$(rand_hex 32)
REFRESH_TOKEN_EXPIRES_IN=7d

# ── Internal service-to-service key ──────────────────────────────
INTERNAL_SERVICE_KEY=$(rand_hex 24)

# ── AI API Keys (users bring their own — leave blank for prod) ───
OPENAI_API_KEY=
OPENROUTER_API_KEY=
GOOGLE_TTS_API_KEY=

GROQ_API_KEY=

# ── Frontend ──────────────────────────────────────────────────────
# Replace YOUR_SERVER_IP with the actual VM public IP (terraform output instance_ip)
VITE_API_URL=http://YOUR_SERVER_IP:3001
PUBLIC_BASE_URL=https://YOUR_DOMAIN

# ── CORS ──────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://YOUR_SERVER_IP:3000
EOF
