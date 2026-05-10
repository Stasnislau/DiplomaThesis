#!/usr/bin/env bash
#
# Convenience runner that boots the local docker-compose stack (if it
# isn't already up), waits for the gateway to answer /api/health, then
# runs the same post-deploy smoke against http://localhost:3001.
#
# Designed for the "did my last refactor break the local stack?"
# loop, NOT for CI — it shells out to docker-compose and is happy
# with whatever Python is on $PATH.
#
# USAGE
#   bash scripts/local_stack_smoke.sh           # quick mode (no auth flow)
#   FULL=1 bash scripts/local_stack_smoke.sh    # also exercise signup→login→speaking→listening
#
# Exits non-zero on any smoke failure or if the stack never became
# healthy within 60 seconds.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATEWAY_URL="${SMOKE_API_URL:-http://localhost:3001}"
FRONTEND_URL="${SMOKE_FRONTEND_URL:-http://localhost:3000}"
WAIT_SECS="${SMOKE_WAIT_SECS:-60}"
FULL_FLAG=""
if [ "${FULL:-0}" = "1" ]; then
  FULL_FLAG="SMOKE_FULL=1"
fi

# Step 1: confirm docker-compose is reachable.
if ! command -v docker >/dev/null 2>&1; then
  echo "✗ docker not on PATH — install Docker first." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "✗ docker compose plugin missing — install it first." >&2
  exit 1
fi

# Step 2: check whether the stack is already healthy. If yes, skip
# the up; we don't want to flap a working dev environment.
echo "→ Checking $GATEWAY_URL/api/health …"
if curl -fsS -o /dev/null --max-time 3 "$GATEWAY_URL/api/health"; then
  echo "  Stack already up — reusing it."
else
  echo "  Not running. Bringing the stack up via docker-compose.yml …"
  ( cd "$REPO" && docker compose up -d )
fi

# Step 3: poll /api/health until it answers 200 or the budget runs out.
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

# Step 4: run the smoke. We invoke the same script post-deploy uses,
# so any bugfix to the smoke logic propagates to both flows.
echo "→ Running post-deploy smoke against $GATEWAY_URL …"
SMOKE_API_URL="$GATEWAY_URL" SMOKE_FRONTEND_URL="$FRONTEND_URL" $FULL_FLAG \
  python3 "$REPO/scripts/post_deploy_smoke.py"
