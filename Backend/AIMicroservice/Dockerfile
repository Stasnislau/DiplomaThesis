# syntax=docker/dockerfile:1.6

FROM python:3.11-slim AS deps

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install poetry

COPY pyproject.toml poetry.lock* ./

ENV POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/root/.cache/pypoetry \
    poetry install --no-ansi --only main

ENV HF_HOME=/app/.hf-cache \
    TRANSFORMERS_CACHE=/app/.hf-cache \
    SENTENCE_TRANSFORMERS_HOME=/app/.hf-cache
RUN --mount=type=cache,target=/root/.cache/huggingface \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

FROM deps AS production

WORKDIR /app

COPY . .

RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

ENV HF_HOME=/app/.hf-cache \
    TRANSFORMERS_CACHE=/app/.hf-cache \
    SENTENCE_TRANSFORMERS_HOME=/app/.hf-cache

EXPOSE 3003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3003"]
