#!/usr/bin/env bash
set -euo pipefail

rand_hex()  { openssl rand -hex "$1"; }
rand_pass() { openssl rand -base64 "$1" | tr -d '/+=' | head -c "$1"; }

cat <<EOF

POSTGRES_USER=diploma_app
POSTGRES_PASSWORD=$(rand_pass 32)

RABBITMQ_USER=diploma_rmq
RABBITMQ_PASSWORD=$(rand_pass 24)

JWT_SECRET=$(rand_hex 32)
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=$(rand_hex 32)
REFRESH_TOKEN_EXPIRES_IN=7d

INTERNAL_SERVICE_KEY=$(rand_hex 24)

KEY_ENCRYPTION_KEY=$(openssl rand -base64 32)

OPENAI_API_KEY=
OPENROUTER_API_KEY=
GOOGLE_TTS_API_KEY=

GROQ_API_KEY=

VERTEX_AI_PROJECT_ID=eloquent-grail-501516-e7
VERTEX_AI_LOCATION=us-central1
VERTEX_CHAT_MODEL=vertex_ai/gemini-3-flash-preview

VITE_API_URL=http://YOUR_SERVER_IP:3001
PUBLIC_BASE_URL=https://YOUR_DOMAIN

ALLOWED_ORIGINS=http://YOUR_SERVER_IP:3000
EOF
