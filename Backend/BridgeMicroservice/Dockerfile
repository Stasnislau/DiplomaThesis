FROM python:3.11-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry

COPY pyproject.toml poetry.lock* ./

RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-dev 2>/dev/null || \
       poetry install --no-interaction --no-ansi --only main

COPY . .

RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 3003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3003"]
