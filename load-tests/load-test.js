import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";
import { SharedArray } from "k6/data";
import exec from "k6/execution";

// ── Configuration ───────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const API = `${BASE_URL}/api/gateway`;

// Custom metrics
const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration", true);
const profileDuration = new Trend("profile_duration", true);
const languagesDuration = new Trend("languages_duration", true);
const learningPathDuration = new Trend("learning_path_duration", true);

// ── Scenarios ───────────────────────────────────────────────────────
//
// Stage 1: Ramp up from 1 → 10 VUs over 30s (warm-up)
// Stage 2: Hold 10 VUs for 1 min (baseline)
// Stage 3: Ramp to 25 VUs, hold 1 min (moderate load)
// Stage 4: Ramp to 50 VUs, hold 1 min (peak load)
// Stage 5: Ramp down to 0 (cool-down)
//
export const options = {
  scenarios: {
    smoke: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 1 },   // warm-up
        { duration: "30s", target: 1 },   // smoke baseline
      ],
      gracefulRampDown: "10s",
      exec: "authenticatedFlow",
    },
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "1m",
      stages: [
        { duration: "30s", target: 10 },  // ramp to 10
        { duration: "1m", target: 10 },   // hold 10
        { duration: "30s", target: 25 },  // ramp to 25
        { duration: "1m", target: 25 },   // hold 25
        { duration: "30s", target: 50 },  // ramp to 50
        { duration: "1m", target: 50 },   // hold 50
        { duration: "30s", target: 0 },   // ramp down
      ],
      gracefulRampDown: "10s",
      exec: "authenticatedFlow",
    },
    public_endpoints: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "1m",
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 20 },
        { duration: "30s", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
      exec: "publicEndpoints",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // 95% of requests under 2s
    errors: ["rate<0.1"],               // error rate under 10%
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

const jsonHeaders = { "Content-Type": "application/json" };

function uniqueEmail() {
  const vu = exec.vu.idInTest;
  const iter = exec.vu.iterationInScenario;
  return `loadtest_vu${vu}_i${iter}_${Date.now()}@test.com`;
}

function registerUser(email, password) {
  const res = http.post(
    `${API}/auth/register`,
    JSON.stringify({
      email: email,
      password: password,
      name: "Load",
      surname: "Tester",
    }),
    { headers: jsonHeaders, tags: { endpoint: "register" } }
  );
  return res;
}

function loginUser(email, password) {
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email: email, password: password }),
    { headers: jsonHeaders, tags: { endpoint: "login" } }
  );
  loginDuration.add(res.timings.duration);
  return res;
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ── Scenario: Public Endpoints (no auth) ────────────────────────────

export function publicEndpoints() {
  group("GET /languages", () => {
    const res = http.get(`${API}/user/languages`, {
      tags: { endpoint: "languages" },
    });
    languagesDuration.add(res.timings.duration);
    const ok = check(res, {
      "languages: status 200": (r) => r.status === 200,
      "languages: has payload": (r) => {
        try {
          return JSON.parse(r.body).success === true;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  sleep(0.5);
}

// ── Scenario: Full Authenticated Flow ───────────────────────────────

export function authenticatedFlow() {
  const email = uniqueEmail();
  const password = "LoadTest123!";
  let token = null;

  // 1. Register
  group("POST /auth/register", () => {
    const res = registerUser(email, password);
    const ok = check(res, {
      "register: status 200 or 201": (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!ok);
  });

  sleep(0.3);

  // 2. Login
  group("POST /auth/login", () => {
    const res = loginUser(email, password);
    const ok = check(res, {
      "login: status 200": (r) => r.status === 200,
      "login: has accessToken": (r) => {
        try {
          return JSON.parse(r.body).payload.accessToken !== undefined;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);

    if (res.status === 200) {
      try {
        token = JSON.parse(res.body).payload.accessToken;
      } catch {
        token = null;
      }
    }
  });

  if (!token) {
    return; // can't continue without auth
  }

  sleep(0.3);

  // 3. Get user profile
  group("GET /user/me", () => {
    const res = http.get(`${API}/user/me`, {
      headers: authHeaders(token),
      tags: { endpoint: "profile" },
    });
    profileDuration.add(res.timings.duration);
    const ok = check(res, {
      "profile: status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.3);

  // 4. Get languages (authenticated)
  group("GET /user/languages", () => {
    const res = http.get(`${API}/user/languages`, {
      headers: authHeaders(token),
      tags: { endpoint: "languages_auth" },
    });
    const ok = check(res, {
      "languages (auth): status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.3);

  // 5. Get learning path
  group("GET /bridge/learning-path", () => {
    const res = http.get(`${API}/bridge/learning-path?language=English`, {
      headers: authHeaders(token),
      tags: { endpoint: "learning_path" },
    });
    learningPathDuration.add(res.timings.duration);
    const ok = check(res, {
      "learning-path: status 200 or 404": (r) =>
        r.status === 200 || r.status === 404,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);
}
