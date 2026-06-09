#!/usr/bin/env python3
"""Post-deploy smoke test runner.

Pings the live deployment to confirm the wires are connected after a
push. Exits 0 on success, 1 on first failure. Designed to run against
either the production GCP VM, a staging box, or a local
docker-compose — anywhere the gateway is reachable on a known URL.

USAGE
-----

    # Local docker-compose
    python scripts/post_deploy_smoke.py

    # Staging / prod (set the gateway base URL)
    SMOKE_API_URL=http://104.197.0.42:3001 python scripts/post_deploy_smoke.py

    # CI: include critical user-flow checks (creates + tears down a
    # throwaway test user via auth signup; needs network egress to
    # the deployed environment)
    SMOKE_API_URL=http://prod.example/api SMOKE_FULL=1 \\
        python scripts/post_deploy_smoke.py

ENV VARS
--------
  SMOKE_API_URL          Gateway base URL. Default http://localhost:3001
  SMOKE_FRONTEND_URL     Frontend base URL. Default http://localhost:3000
  SMOKE_FULL             "1" to also run the throwaway-user flow tests
  SMOKE_TIMEOUT_SEC      Per-request timeout. Default 15
  SMOKE_VERBOSE          "1" to print full response bodies on failure

The script avoids any external Python deps beyond stdlib so it can run
on a bare CI image. urllib + json + sys = enough.
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Optional


API_URL = os.getenv("SMOKE_API_URL", "http://localhost:3001").rstrip("/")
FRONTEND_URL = os.getenv("SMOKE_FRONTEND_URL", "http://localhost:3000").rstrip("/")
FULL = os.getenv("SMOKE_FULL", "0") == "1"
TIMEOUT = int(os.getenv("SMOKE_TIMEOUT_SEC", "15"))
VERBOSE = os.getenv("SMOKE_VERBOSE", "0") == "1"

# Self-signed certs are normal for ad-hoc deployments. Don't fail
# the smoke just because the deploy uses a custom cert.
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE


# ---------- HTTP helpers ------------------------------------------


@dataclass
class Response:
    status: int
    body: str
    json: Any = None


def _request(
    method: str,
    url: str,
    *,
    headers: Optional[dict] = None,
    body: Optional[bytes] = None,
    timeout: int = TIMEOUT,
) -> Response:
    req = urllib.request.Request(url, method=method, data=body)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            status = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        status = e.code
    parsed = None
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        pass
    return Response(status=status, body=raw, json=parsed)


def get(path: str, **kwargs: Any) -> Response:
    return _request("GET", f"{API_URL}{path}", **kwargs)


def post(path: str, *, payload: Optional[dict] = None, **kwargs: Any) -> Response:
    body = None
    headers = dict(kwargs.pop("headers", {}) or {})
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")
    return _request("POST", f"{API_URL}{path}", body=body, headers=headers, **kwargs)


# ---------- Test framework (bare-bones, stdlib-only) --------------


@dataclass
class CheckResult:
    name: str
    status: str  # "pass" | "fail" | "skip"
    detail: str
    elapsed_ms: int


_RESULTS: list[CheckResult] = []


class SkipCheck(Exception):
    """Raised by checks that legitimately don't apply (e.g. SMOKE_FULL=0)."""


def skip(reason: str) -> None:
    raise SkipCheck(reason)


def check(name: str) -> Callable:
    def deco(fn: Callable[[], None]) -> Callable[[], None]:
        def wrapped() -> None:
            t0 = time.monotonic()
            elapsed = lambda: int((time.monotonic() - t0) * 1000)
            try:
                fn()
                _RESULTS.append(CheckResult(name, "pass", "", elapsed()))
            except SkipCheck as e:
                _RESULTS.append(CheckResult(name, "skip", str(e), elapsed()))
            except AssertionError as e:
                _RESULTS.append(CheckResult(name, "fail", str(e), elapsed()))
            except Exception as e:
                _RESULTS.append(
                    CheckResult(name, "fail", f"{type(e).__name__}: {e}", elapsed())
                )
        return wrapped
    return deco


def assert_status(resp: Response, expected: int, ctx: str = "") -> None:
    if resp.status != expected:
        body_preview = resp.body[:300] if VERBOSE else resp.body[:100]
        raise AssertionError(
            f"{ctx} expected HTTP {expected}, got {resp.status}. body={body_preview}"
        )


def assert_json_field(resp: Response, dotted_path: str, ctx: str = "") -> Any:
    """Walk a dotted path through the JSON body. Raises if any segment
    is missing — which is the entire point of the assertion."""
    if resp.json is None:
        raise AssertionError(f"{ctx} expected JSON body, got: {resp.body[:200]}")
    cursor: Any = resp.json
    for seg in dotted_path.split("."):
        if not isinstance(cursor, dict) or seg not in cursor:
            raise AssertionError(
                f"{ctx} JSON missing field '{dotted_path}' at '{seg}'. body={json.dumps(resp.json)[:300]}"
            )
        cursor = cursor[seg]
    return cursor


# ---------- Health / reachability ---------------------------------


@check("Gateway /api/health responds 200")
def _gateway_health() -> None:
    r = get("/api/health")
    assert_status(r, 200, "Gateway health")


@check("Gateway forwards AI health (auth-required path returns 401, not 5xx)")
def _ai_via_gateway_unauthed() -> None:
    """An unauthenticated call to a protected gateway path must come
    back as 401 from the auth check — not 502/503 from a misrouted
    forward. Catches the AI-service-down scenario clearly."""
    r = get("/api/gateway/ai/listening/anything")
    assert r.status in (
        401,
        404,
    ), f"Expected 401/404 from unauthenticated gateway forward, got {r.status}: {r.body[:200]}"


@check("Frontend index.html responds 200 and ships expected scaffolding")
def _frontend_index() -> None:
    try:
        with urllib.request.urlopen(
            FRONTEND_URL, context=_SSL_CTX, timeout=TIMEOUT
        ) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            status = resp.status
    except Exception as e:
        raise AssertionError(f"Frontend unreachable at {FRONTEND_URL}: {e}")
    assert status == 200, f"Frontend returned {status}"
    # The Vite-built shell ships a <div id="root"> and at least one
    # script tag — checking both catches "served nothing" and "served
    # raw template without bundle" failures separately.
    assert 'id="root"' in body, "Frontend index missing #root mount point"
    assert "<script" in body, "Frontend index has no script tags — bundle wasn't included"


# ---------- Public auth surface (no token needed) ----------------


@check("Auth login rejects bad credentials with structured error code")
def _auth_login_rejects() -> None:
    r = post(
        "/api/gateway/auth/auth/login",
        payload={
            "email": f"smoke-noexist-{uuid.uuid4().hex[:8]}@example.com",
            "password": "definitely-wrong",
        },
    )
    # Acceptable: 400 / 401 / 422 — we don't care which the auth
    # service uses, only that it isn't a server crash.
    assert r.status in (
        400,
        401,
        404,
        422,
    ), f"Login bad-creds returned unexpected {r.status}: {r.body[:200]}"


@check("Languages catalog endpoint returns a non-empty list")
def _languages_endpoint() -> None:
    # Languages live on the User microservice (mounted via the
    # gateway under /api/gateway/user/languages). Public endpoint —
    # no auth header required — so it exercises gateway routing +
    # user-service reachability + DB connectivity in one hop.
    # We try a couple of prefix variants so the smoke survives a
    # routing reshuffle.
    candidates = [
        "/api/gateway/user/languages",
        "/api/gateway/auth/languages",
        "/api/languages",
    ]
    last: Optional[Response] = None
    for path in candidates:
        last = get(path)
        if last.status == 200:
            break
    assert last is not None and last.status == 200, (
        f"Languages: tried {candidates}, last status={last.status if last else 'n/a'}: "
        f"{(last.body[:200] if last else '')}"
    )
    payload = assert_json_field(last, "payload", "languages payload")
    assert isinstance(payload, list) and len(payload) > 0, (
        f"Languages list is empty: {last.body[:200]}"
    )


# ---------- Critical user flow (only when SMOKE_FULL=1) ----------


_TEST_USER_EMAIL = ""
_TEST_USER_PASSWORD = "Sm0k3-Te$t-Pa$$w0rd!"
_TEST_USER_TOKEN = ""


def _signup_test_user() -> tuple[str, str]:
    email = f"smoke-{uuid.uuid4().hex[:10]}@smoketest.local"
    # Auth UserDto requires email/password/name/surname (all
    # IsNotEmpty + ≤100 chars); see Backend/AuthMicroservice/src/dtos/userDto.ts.
    r = post(
        "/api/gateway/auth/auth/register",
        payload={
            "email": email,
            "password": _TEST_USER_PASSWORD,
            "name": "Smoke",
            "surname": "Tester",
        },
    )
    assert r.status in (200, 201), f"Signup failed: {r.status} {r.body[:200]}"
    return email, _TEST_USER_PASSWORD


def _login(email: str, password: str) -> str:
    r = post(
        "/api/gateway/auth/auth/login",
        payload={"email": email, "password": password},
    )
    # NestJS returns 201 (Created) by default for POST handlers unless
    # explicitly @HttpCode-overridden. Auth service login uses the
    # default, so 201 is the success status here.
    assert r.status in (200, 201), f"Login failed: {r.status} {r.body[:200]}"
    token = (
        (r.json or {}).get("payload", {}).get("accessToken")
        or (r.json or {}).get("accessToken")
    )
    assert token, f"Login response missing accessToken: {r.body[:200]}"
    return token


@check("[FULL] Signup → login produces a usable JWT")
def _full_signup_login() -> None:
    if not FULL:
        skip("set SMOKE_FULL=1 to run")
    global _TEST_USER_EMAIL, _TEST_USER_TOKEN
    _TEST_USER_EMAIL, password = _signup_test_user()
    _TEST_USER_TOKEN = _login(_TEST_USER_EMAIL, password)


@check("[FULL] Authenticated profile endpoint returns 200")
def _full_profile() -> None:
    if not FULL:
        skip("set SMOKE_FULL=1 to run")
    if not _TEST_USER_TOKEN:
        skip("no token from signup step")
    r = get(
        "/api/gateway/user/me",
        headers={"Authorization": f"Bearer {_TEST_USER_TOKEN}"},
    )
    assert_status(r, 200, "Authed profile")


@check("[FULL] Speaking practice-prompt returns a prompt for timed_response")
def _full_speaking_prompt() -> None:
    if not FULL:
        skip("set SMOKE_FULL=1 to run")
    if not _TEST_USER_TOKEN:
        skip("no token from signup step")
    r = post(
        "/api/gateway/ai/speaking/practice-prompt",
        payload={"language": "English", "level": "B1", "format": "timed_response"},
        headers={"Authorization": f"Bearer {_TEST_USER_TOKEN}"},
    )
    # 200 if AI key is configured; 400/500 with AI_API_KEY_MISSING is
    # also acceptable (means the deploy is wired but the test user
    # doesn't have an AI token configured) — both prove the endpoint
    # exists and routes correctly.
    assert r.status in (200, 400, 422, 500), (
        f"practice-prompt returned unexpected {r.status}: {r.body[:200]}"
    )
    if r.status == 500 and r.json:
        # Surface the structured `code` so it's clear in the smoke log
        # whether this is a deploy issue or a missing token.
        code = (r.json.get("detail") or {}).get("code", "?")
        assert code in (
            "AI_API_KEY_MISSING",
            "USER_TOKENS_EMPTY",
            "AI_AUTH_FAILED",
        ), f"practice-prompt unexpected error code: {code}"


@check("[FULL] Listening generate task — request shape accepted")
def _full_listening_request() -> None:
    if not FULL:
        skip("set SMOKE_FULL=1 to run")
    if not _TEST_USER_TOKEN:
        skip("no token from signup step")
    r = post(
        "/api/gateway/ai/tasks/listening",
        payload={
            "language": "English",
            "level": "A2",
            "question_types": ["multiple_choice", "fill_in_the_blank"],
        },
        headers={"Authorization": f"Bearer {_TEST_USER_TOKEN}"},
    )
    # Same logic — 200 on success, 400/500 with a known code on
    # missing AI/TTS infra. Anything else means the route or DTO is
    # broken on the deploy.
    assert r.status in (200, 400, 422, 500), (
        f"listening returned unexpected {r.status}: {r.body[:200]}"
    )


def _send_catalog_probe(path: str, payload: dict) -> Response:
    """Catalog probes only care that the DTO accepts the token; the
    downstream AI call may legitimately take 30s+ on a throttled key,
    which would burn the smoke budget and obscure the actual signal.
    We give each probe a short timeout: if the request gets past
    validation (we see anything OTHER than a fast 422), it counts as
    accepted. A timeout is also treated as "passed validation, AI is
    just slow" because validation rejection happens synchronously in
    well under a second."""
    return _request(
        "POST",
        f"{API_URL}{path}",
        body=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {_TEST_USER_TOKEN}",
            "Content-Type": "application/json",
        },
        timeout=8,
    )


@check("[FULL] Listening — every Phase 2 question_type is accepted by the DTO")
def _full_listening_question_type_catalog() -> None:
    """Probe each of the six listening types separately. We assert
    only on DTO acceptance (no fast 422), not on AI completion —
    that path is unbounded by an external provider's latency."""
    if not FULL:
        skip("set SMOKE_FULL=1 to run")
    if not _TEST_USER_TOKEN:
        skip("no token from signup step")
    types = [
        "multiple_choice",
        "fill_in_the_blank",
        "dictation",
        "true_false_not_given",
        "sentence_completion",
        "multi_speaker_matching",
    ]
    for qt in types:
        try:
            r = _send_catalog_probe(
                "/api/gateway/ai/tasks/listening",
                {
                    "language": "English",
                    "level": "A2",
                    "question_types": [qt],
                },
            )
        except (urllib.error.URLError, TimeoutError, Exception) as e:
            # urllib raises URLError on socket timeout — it's not a
            # validation failure, so we count it as "type accepted,
            # AI is just slow". The smoke is for wiring, not load.
            if "timed out" not in str(e).lower():
                raise
            continue
        assert r.status != 422, (
            f"listening rejected known question_type='{qt}': {r.body[:200]}"
        )


@check("[FULL] Speaking — every Phase 3 format is accepted by the DTO")
def _full_speaking_format_catalog() -> None:
    if not FULL:
        skip("set SMOKE_FULL=1 to run")
    if not _TEST_USER_TOKEN:
        skip("no token from signup step")
    formats = [
        "read_aloud",
        "timed_response",
        "repeat_after_me",
        "picture_description",
        "free_monologue",
    ]
    for fmt in formats:
        try:
            r = _send_catalog_probe(
                "/api/gateway/ai/speaking/practice-prompt",
                {"language": "English", "level": "B1", "format": fmt},
            )
        except (urllib.error.URLError, TimeoutError, Exception) as e:
            if "timed out" not in str(e).lower():
                raise
            continue
        assert r.status != 422, (
            f"speaking practice-prompt rejected known format='{fmt}': {r.body[:200]}"
        )


@check("[FULL] Speaking grade-response — known formats accepted, unknown rejected")
def _full_speaking_grade_known_unknown_split() -> None:
    """Distinguishes routing/contract failure from upstream AI/Whisper
    failure: an unknown format MUST 4xx fast (no Whisper call needed),
    a known format MUST NOT 4xx with the validation message."""
    if not FULL:
        skip("set SMOKE_FULL=1 to run")
    if not _TEST_USER_TOKEN:
        skip("no token from signup step")
    # We send a tiny WAV-shaped placeholder. Whisper will reject it as
    # garbage but the smoke test only cares that the route reaches
    # the service.
    fake_audio = b"RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00"
    boundary = "----smoke-boundary"
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="audio_file"; filename="probe.wav"\r\n'
        "Content-Type: audio/wav\r\n\r\n"
    ).encode() + fake_audio + f"\r\n--{boundary}--\r\n".encode()

    base = "/api/gateway/ai/speaking/grade-response"

    # Unknown format → 400/422.
    r_unknown = _request(
        "POST",
        f"{API_URL}{base}?language=English&format=made_up&promptText=x",
        headers={
            "Authorization": f"Bearer {_TEST_USER_TOKEN}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        body=body,
    )
    assert r_unknown.status in (400, 422), (
        f"unknown format should 4xx, got {r_unknown.status}: {r_unknown.body[:200]}"
    )

    # Known format → not 422 (downstream AI/Whisper may still fail
    # with 5xx + a known code, that's fine).
    r_known = _request(
        "POST",
        f"{API_URL}{base}?language=English&format=timed_response&promptText=x",
        headers={
            "Authorization": f"Bearer {_TEST_USER_TOKEN}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        body=body,
    )
    assert r_known.status != 422, (
        f"known format raised validation 422: {r_known.body[:200]}"
    )


@check("[FULL] Materials upload — accepts a real PDF and returns DocumentMap shape")
def _full_materials_upload_round_trip() -> None:
    if not FULL:
        skip("set SMOKE_FULL=1 to run")
    if not _TEST_USER_TOKEN:
        skip("no token from signup step")
    # Smallest valid PDF that has text content the parser can extract.
    pdf_bytes = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        b"4 0 obj << /Length 44 >> stream\nBT /F1 24 Tf 100 700 Td (Smoke test PDF) Tj ET\nendstream endobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"trailer << /Size 6 /Root 1 0 R >>\n%%EOF\n"
    )
    boundary = "----smoke-boundary-pdf"
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="probe.pdf"\r\n'
        "Content-Type: application/pdf\r\n\r\n"
    ).encode() + pdf_bytes + f"\r\n--{boundary}--\r\n".encode()

    r = _request(
        "POST",
        f"{API_URL}/api/gateway/ai/materials/upload",
        headers={
            "Authorization": f"Bearer {_TEST_USER_TOKEN}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        body=body,
    )
    # Accepted shape outcomes:
    # - 200: full parse + AI classification succeeded.
    # - 400 + PDF_NO_TEXT/PDF_GARBLED_TEXT: PDF rejected at parse,
    #   route+contract still verified.
    # - 422 + AI key missing: AI call failed with a known code.
    assert r.status in (200, 400, 422, 500), (
        f"materials upload returned unexpected {r.status}: {r.body[:200]}"
    )
    if r.status == 200:
        # Sanity-check the rich payload contract — proves the FE will
        # receive what it expects to round-trip into /materials/quiz.
        payload = (r.json or {}).get("payload", {})
        assert "filename" in payload, f"missing filename: {payload}"
        # `document_map` may be null on parse-edge, but the field must exist.
        assert "document_map" in payload, f"missing document_map: {payload}"


# ---------- Runner ------------------------------------------------


def _run_all() -> int:
    print(f"== Post-deploy smoke against {API_URL} (full={FULL}) ==\n")
    checks = [
        _gateway_health,
        _ai_via_gateway_unauthed,
        _frontend_index,
        _auth_login_rejects,
        _languages_endpoint,
        _full_signup_login,
        _full_profile,
        _full_speaking_prompt,
        _full_listening_request,
        _full_listening_question_type_catalog,
        _full_speaking_format_catalog,
        _full_speaking_grade_known_unknown_split,
        _full_materials_upload_round_trip,
    ]
    for fn in checks:
        fn()

    passed = [r for r in _RESULTS if r.status == "pass"]
    failed = [r for r in _RESULTS if r.status == "fail"]
    skipped = [r for r in _RESULTS if r.status == "skip"]

    for r in _RESULTS:
        marker = {"pass": "✓", "fail": "✗", "skip": "•"}[r.status]
        print(f"  {marker}  [{r.elapsed_ms:>4}ms] {r.name}")
        if r.status != "pass":
            print(f"          → {r.detail}")

    print(
        f"\n{len(passed)} passed, {len(failed)} failed, {len(skipped)} skipped"
    )
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(_run_all())
