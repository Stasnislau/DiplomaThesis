FROM python:3.11-slim AS production

WORKDIR /app

# System dependencies for some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry

# Copy dependency files first (cache layer)
COPY pyproject.toml poetry.lock* ./

# Install dependencies (no dev, no virtualenv inside container)
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-dev 2>/dev/null || \
       poetry install --no-interaction --no-ansi --only main

# Copy application code
COPY . .

EXPOSE 3003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3003"]
