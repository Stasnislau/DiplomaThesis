# Easy Language

Engineering thesis, Warsaw University of Technology, Institute of Computer Science.

Web app for language practice. A placement test sets the CEFR level. After that, the app generates exercises at that level. A large language model writes every task.

Public URL: https://34-118-102-169.sslip.io

## Exercises

Fifteen generated items per language. The result is a CEFR level, strengths, weaknesses, a recommendation.

Reading, grammar, vocabulary: seven languages. Multiple-choice or fill-in-the-blank.

Upload a PDF. The app extracts the text into a vector store. Questions are built from that source.

Listening starts with a generated dialogue. Text-to-speech makes an MP3. Comprehension questions come with the file.

The learner records a spoken answer. The app transcribes it, then scores intelligibility, fluency, words per minute, pause length.

Model calls go through LiteLLM. A learner may store a personal API key instead of the system key.

## Architecture

Four backend services behind a gateway:

| Service | Stack | Responsibility |
|---|---|---|
| Gateway | NestJS | single entry point, routing, token validation, rate limits |
| Auth | NestJS + Prisma | accounts, credentials, refresh tokens, roles |
| User | NestJS + Prisma | profiles, languages, progress, achievements, history |
| AI | Python, FastAPI | generation, evaluation, speech, materials |

PostgreSQL holds relational data. Each owning service has its own database. LanceDB is the vector store for CEFR descriptors plus uploaded materials. RabbitMQ passes account events from Auth to User. The client is a React single-page application built with Vite.

## Local run

```bash
./generate-env.sh     # writes .env files from the examples
./start-project.sh    # installs deps, then starts every service
```

Or with containers:

```bash
docker compose up --build
```

Frontend: `http://localhost:5173`. Gateway: `http://localhost:3001`.

Needs Node 20+, Python 3.11+, Docker (Postgres, RabbitMQ).

## Deployment

`terraform/` is the VM, disk, static address, firewall. `terraform apply` builds that from an empty project. First boot installs Docker, then pulls the repository. `docker-compose.prod.yml` runs the stack behind Caddy. Caddy gets certificates from Let's Encrypt.

## Layout

```
Backend/     four services
Frontend/    React client
terraform/   infrastructure
load-tests/  load test of the gateway (Grafana k6)
```
