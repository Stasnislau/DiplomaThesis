"""Shared setup for the suites that call a real model.

Everything here talks to a live provider. Nothing in this directory skips: a
missing key fails the run, and a provider that answers 429 or 5xx is retried
before the case is allowed to fail, because a rate limit is not a defect in the
application.
"""

from __future__ import annotations

import os
import time
from typing import Any, Iterable
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient

load_dotenv(
    os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
    override=False,
)

GROQ_KEY = os.getenv("GROQ_API_KEY", "")
# groq: learner has a stored Groq key (the training-provider path).
# system: no stored keys — the request must land on google-geminis / Vertex Flash.
E2E_PROVIDER = os.getenv("E2E_PROVIDER", "groq").strip().lower() or "groq"

RATE_LIMIT_PAUSE = 4
RETRY_PAUSE = 12
MAX_ATTEMPTS = 3
RETRYABLE = {429, 500, 502, 503, 504}

_TEST_JWT_SECRET = "e2e-test-jwt-secret"
_TEST_USER_ID = "e2e-user-00000000"


def headers(ui_locale: str = "en") -> dict:
    token = jwt.encode(
        {"sub": _TEST_USER_ID, "iat": int(time.time())},
        _TEST_JWT_SECRET,
        algorithm="HS256",
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-User-Id": _TEST_USER_ID,
        "X-User-Email": f"{_TEST_USER_ID}@e2e.local",
        "X-User-Role": "user",
        "X-UI-Locale": ui_locale,
    }


def post_live(
    client: TestClient,
    path: str,
    body: dict,
    ui_locale: str = "en",
) -> dict:
    """Call an endpoint that reaches a real model and return its payload.

    A provider under load answers 429 or 5xx, which says nothing about the code
    under test, so the call is repeated. When every attempt fails, the case
    fails and names the last status.
    """
    last: Any = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        last = client.post(path, json=body, headers=headers(ui_locale))
        if last.status_code == 200:
            payload = last.json()
            assert payload.get("success") is True, f"not success: {payload}"
            return payload["payload"]
        assert last.status_code in RETRYABLE, (
            f"{path} answered {last.status_code}: {last.text[:400]}"
        )
        if attempt < MAX_ATTEMPTS:
            time.sleep(RETRY_PAUSE)
    raise AssertionError(
        f"{path} kept answering {last.status_code} over {MAX_ATTEMPTS} attempts: "
        f"{last.text[:400]}"
    )


@pytest.fixture(autouse=True)
def _env_and_throttle(monkeypatch: pytest.MonkeyPatch) -> None:
    if E2E_PROVIDER == "groq":
        assert GROQ_KEY, "GROQ_API_KEY must be set: these tests call a real provider"
    monkeypatch.setenv("PUBLIC_BASE_URL", "http://e2e.test")
    # LiteLLM's Vertex client reads VERTEXAI_* , the app .env uses VERTEX_AI_*.
    project = os.getenv("VERTEX_AI_PROJECT_ID") or os.getenv("VERTEXAI_PROJECT")
    # Gemini 3 Flash is global; VERTEX_AI_LOCATION is for Imagen, not chat.
    chat_location = os.getenv("VERTEX_CHAT_LOCATION") or "global"
    if project:
        monkeypatch.setenv("VERTEXAI_PROJECT", project)
    monkeypatch.setenv("VERTEXAI_LOCATION", chat_location)
    if E2E_PROVIDER == "system":
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
    time.sleep(RATE_LIMIT_PAUSE)


@pytest.fixture
def client() -> Iterable[TestClient]:
    """The application with only the neighbours mocked. Every model call is real."""
    if E2E_PROVIDER == "groq":
        token_patch = patch(
            "services.user_service.UserService.get_default_ai_token",
            new=AsyncMock(return_value={"aiProviderId": "groq", "token": GROQ_KEY}),
        )
    else:
        token_patch = patch(
            "services.user_service.UserService.get_default_ai_token",
            new=AsyncMock(side_effect=Exception("No AI tokens configured for user")),
        )
    with patch(
        "services.user_service.UserService.get_recent_history",
        new=AsyncMock(return_value=[]),
    ), patch(
        "services.user_service.UserService.log_task_history",
        new=AsyncMock(return_value=None),
    ), token_patch, patch(
        "services.listening_task_service.os.makedirs",
    ), patch(
        "services.listening_task_service.aiofiles.open",
    ) as listen_aio, patch(
        "services.speaking_service.os.makedirs",
    ), patch(
        "services.speaking_service.aiofiles.open",
    ) as speak_aio:
        for ao in (listen_aio, speak_aio):
            ctx = MagicMock()
            ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
            ctx.__aexit__ = AsyncMock(return_value=None)
            ao.return_value = ctx

        from main import app

        yield TestClient(app)
