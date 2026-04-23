# Load Testing

## Prerequisites

```bash
brew install k6
```

## Running

1. Start the project (all services must be up):
```bash
docker compose up -d
# OR use start-project.sh for local dev
```

2. Run the load test:
```bash
cd load-tests

# Local dev (default: http://localhost:3001)
k6 run --summary-export=results.json load-test.js

# Against production server
k6 run --summary-export=results.json -e BASE_URL=http://YOUR_SERVER_IP:3001 load-test.js
```

3. Generate LaTeX table from results:
```bash
python3 generate-report.py results.json
```

## What it tests

| Scenario | Duration | Peak VUs | Endpoints |
|---|---|---|---|
| Smoke | 1 min | 1 | Full auth flow |
| Load | 5 min | 50 | Full auth flow |
| Public | 3 min | 50 | GET /languages |

### Full auth flow per iteration:
1. `POST /auth/register` - create user
2. `POST /auth/login` - get JWT
3. `GET /user/me` - fetch profile
4. `GET /user/languages` - fetch languages
5. `GET /bridge/learning-path` - fetch curriculum

## Interpreting results

- **p95 < 2000ms** = passing threshold
- **error rate < 10%** = passing threshold
- Watch for p99 spikes - these indicate bottlenecks
