# syntax=docker/dockerfile:1.6
#
# Multi-stage build for the Bridge microservice.
#
# Three things make this faster than a naive single-stage:
#
# 1. The `deps` stage installs only what depends on pyproject.toml /
#    poetry.lock. As long as those files don't change, Docker reuses
#    the layer wholesale — even a 40-minute torch+transformers install
#    becomes a no-op on the next deploy.
#
# 2. BuildKit cache mounts on apt, pip, and poetry caches. These
#    survive across builds (even when the layer above is invalidated),
#    so dependency churn doesn't re-download wheels from PyPI / PyTorch
#    every time. Requires DOCKER_BUILDKIT=1 (default in modern docker)
#    and the syntax= directive on line 1.
#
# 3. The sentence-transformers `all-MiniLM-L6-v2` model used by
#    VectorDBService is downloaded into a baked-in HF cache at build
#    time. Previously every container start re-fetched it from
#    HuggingFace (~80 MB, +30-60 s warmup); now first-request is
#    instant.

# ── Stage 1: dependency layer ──────────────────────────────────────
FROM python:3.14-slim AS deps

WORKDIR /app

# Apt cache mount: keeps the .deb downloads around between builds
# instead of re-pulling from the mirror every time.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install poetry once into a pip cache mount.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install poetry

COPY pyproject.toml poetry.lock* ./

# Pip + poetry caches: downloaded wheels persist even when
# pyproject.toml changes (only the unchanged-deps wheels are reused).
ENV POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/root/.cache/pypoetry \
    poetry install --no-ansi --only main

# Pre-download the sentence-transformers model into a build-baked HF
# cache. The path /app/.hf-cache is set via env vars below so both
# transformers and sentence-transformers find it at runtime.
ENV HF_HOME=/app/.hf-cache \
    TRANSFORMERS_CACHE=/app/.hf-cache \
    SENTENCE_TRANSFORMERS_HOME=/app/.hf-cache
RUN --mount=type=cache,target=/root/.cache/huggingface \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# ── Stage 2: app layer ─────────────────────────────────────────────
# Reuses the deps stage above. The COPY . . here only invalidates
# THIS stage, so a code-only change skips the entire dep install.
FROM deps AS production

WORKDIR /app

COPY . .

RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

# Re-export the cache env vars in the runtime layer so they're picked
# up by the actual python process, not just the build.
ENV HF_HOME=/app/.hf-cache \
    TRANSFORMERS_CACHE=/app/.hf-cache \
    SENTENCE_TRANSFORMERS_HOME=/app/.hf-cache

EXPOSE 3003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3003"]
