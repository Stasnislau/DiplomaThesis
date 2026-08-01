#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATEWAY_URL="${SMOKE_API_URL:-http://localhost:3001}"
FRONTEND_URL="${SMOKE_FRONTEND_URL:-http://localhost:3000}"
WAIT_SECS="${SMOKE_WAIT_SECS:-60}"
FULL_FLAG=""
if [ "${FULL:-0}" = "1" ]; then
  FULL_FLAG="SMOKE_FULL=1"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ docker not on PATH — install Docker first." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "✗ docker compose plugin missing — install it first." >&2
  exit 1
fi

echo "→ Checking $GATEWAY_URL/api/health …"
if curl -fsS -o /dev/null --max-time 3 "$GATEWAY_URL/api/health"; then
  echo "  Stack already up — reusing it."
else
  echo "  Not running. Bringing the stack up via docker-compose.yml …"
  ( cd "$REPO" && docker compose up -d )
fi

deadline=$(( $(date +%s) + WAIT_SECS ))
echo "→ Waiting up to ${WAIT_SECS}s for gateway healthcheck …"
while ! curl -fsS -o /dev/null --max-time 3 "$GATEWAY_URL/api/health"; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "✗ Gateway did not become healthy within ${WAIT_SECS}s." >&2
    echo "  Tail of compose logs follows for triage:" >&2
    ( cd "$REPO" && docker compose logs --tail=40 gateway || true ) >&2
    exit 1
  fi
  sleep 2
done
echo "  ✓ Gateway healthy."

echo "→ Running post-deploy smoke against $GATEWAY_URL …"
SMOKE_API_URL="$GATEWAY_URL" SMOKE_FRONTEND_URL="$FRONTEND_URL" $FULL_FLAG \
  python3 "$REPO/scripts/post_deploy_smoke.py"
