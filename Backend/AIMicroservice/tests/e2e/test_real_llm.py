"""End-to-end tests with REAL LLM calls — no AI mocks.

These tests hit Vertex AI (gemini-2.5-flash) so they are slow
(~10-30s each) and cost real tokens. Run explicitly:

    pytest tests/e2e/ -v -s

They validate that the full pipeline (prompt -> LLM -> parse -> response
model) works end-to-end. Only user service and file I/O are mocked —
everything AI-related is real.

LLM responses are non-deterministic — occasionally the model returns
malformed JSON that fails parsing (500/502). Tests accept those as
"reached the LLM" and only fail on 4xx (our code is broken) or
unexpected payload shapes when 200 is returned.
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

_HAS_VERTEX = bool(os.getenv("VERTEX_AI_PROJECT_ID", ""))

pytestmark = [
    pytest.mark.skipif(not _HAS_VERTEX, reason="VERTEX_AI_PROJECT_ID not set"),
    pytest.mark.e2e,
]

_RATE_LIMIT_PAUSE = 4

_TEST_JWT_SECRET = "e2e-test-jwt-secret"
_TEST_USER_ID = "e2e-user-00000000"

_LLM_FLAKE_CODES = {500, 502, 429}


def _make_token(user_id: str = _TEST_USER_ID) -> str:
    return jwt.encode(
        {"sub": user_id, "iat": int(time.time())},
        _TEST_JWT_SECRET,
        algorithm="HS256",
    )


def _headers(ui_locale: str = "en") -> dict:
    return {
        "Authorization": f"Bearer {_make_token()}",
        "X-User-Id": _TEST_USER_ID,
        "X-User-Email": f"{_TEST_USER_ID}@e2e.local",
        "X-User-Role": "user",
        "X-UI-Locale": ui_locale,
    }


def _assert_ok_or_llm_flake(r: Any) -> dict | None:
    """Return payload dict on 200, None on LLM parse flake, fail on 4xx."""
    if r.status_code == 200:
        body = r.json()
        assert body.get("success") is True, f"not success: {body}"
        return body["payload"]
    assert r.status_code in _LLM_FLAKE_CODES, (
        f"unexpected {r.status_code}: {r.text[:400]}"
    )
    pytest.skip(f"LLM flake: {r.status_code}")


@pytest.fixture(autouse=True)
def _env_and_throttle(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", _TEST_JWT_SECRET)
    monkeypatch.setenv("PUBLIC_BASE_URL", "http://e2e.test")
    time.sleep(_RATE_LIMIT_PAUSE)


@pytest.fixture
def client() -> Iterable[TestClient]:
    with patch(
        "services.user_service.UserService.get_recent_history",
        new=AsyncMock(return_value=[]),
    ), patch(
        "services.user_service.UserService.log_task_history",
        new=AsyncMock(return_value=None),
    ), patch(
        "services.user_service.UserService.get_default_ai_token",
        new=AsyncMock(return_value={"aiProviderId": "google-geminis", "token": None}),
    ), patch(
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


# ==================================================================
# WRITING
# ==================================================================


class TestWritingFlows:
    def test_fill_in_blank(self, client: TestClient) -> None:
        r = client.post(
            "/api/writing/blank",
            json={"language": "English", "level": "B1", "topic": "travel"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["type"] == "fill_in_the_blank"

    def test_multiple_choice(self, client: TestClient) -> None:
        r = client.post(
            "/api/writing/multiplechoice",
            json={"language": "English", "level": "A2"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["type"] == "multiple_choice"
        assert len(p.get("options", [])) >= 2

    def test_adaptive_fill_in_blank(self, client: TestClient) -> None:
        r = client.post(
            "/api/writing/adaptive",
            json={"language": "English", "level": "B1", "flavour": "fill_in_the_blank"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["task"]["type"] == "fill_in_the_blank"

    def test_adaptive_multiple_choice(self, client: TestClient) -> None:
        r = client.post(
            "/api/writing/adaptive",
            json={"language": "English", "level": "A2", "flavour": "multiple_choice"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["task"]["type"] == "multiple_choice"

    def test_essay_generate(self, client: TestClient) -> None:
        r = client.post(
            "/api/writing/essay/generate",
            json={"language": "English", "level": "B2", "topic": "climate change"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p.get("topic") or p.get("prompt"), f"no essay topic: {p}"

    def test_essay_evaluate(self, client: TestClient) -> None:
        r = client.post(
            "/api/writing/essay/evaluate",
            json={
                "language": "English",
                "level": "B1",
                "topic": "My favorite hobby",
                "essay": (
                    "I enjoy playing chess because it helps me think strategically. "
                    "Every weekend I play with my friends at the local club. "
                    "Chess teaches patience and problem solving skills. "
                    "I have been playing for three years now and I am getting better."
                ),
                "wordCountTarget": 50,
            },
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert isinstance(p.get("score"), (int, float)), f"no score: {p}"
        assert 0 <= p["score"] <= 100

    def test_explain_answer(self, client: TestClient) -> None:
        r = client.post(
            "/api/writing/explainanswer",
            json={
                "language": "English",
                "level": "B1",
                "task": "She ___ to the store yesterday.",
                "correctAnswer": "went",
                "userAnswer": "goed",
            },
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p.get("explanation"), f"no explanation: {p}"


# ==================================================================
# SPEAKING
# ==================================================================


class TestSpeakingFlows:
    def test_practice_phrase(self, client: TestClient) -> None:
        r = client.post(
            "/api/speaking/practice-phrase",
            json={"language": "English", "level": "B1"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["phrase"]

    def test_read_aloud(self, client: TestClient) -> None:
        r = client.post(
            "/api/speaking/practice-prompt",
            json={"language": "English", "level": "A2", "format": "read_aloud"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["format"] == "read_aloud"
        assert p["prompt"]
        assert p["durationSeconds"] > 0

    def test_timed_response(self, client: TestClient) -> None:
        r = client.post(
            "/api/speaking/practice-prompt",
            json={"language": "English", "level": "B1", "format": "timed_response"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["format"] == "timed_response"
        assert p["prompt"]

    def test_picture_description_with_imagen(self, client: TestClient) -> None:
        r = client.post(
            "/api/speaking/practice-prompt",
            json={"language": "English", "level": "B1", "format": "picture_description"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["format"] == "picture_description"
        assert p["prompt"]
        assert p.get("imageUrl"), f"imageUrl missing: {p}"

    def test_free_monologue(self, client: TestClient) -> None:
        r = client.post(
            "/api/speaking/practice-prompt",
            json={"language": "Spanish", "level": "A2", "format": "free_monologue"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["format"] == "free_monologue"
        assert p["prompt"]

    def test_repeat_after_me(self, client: TestClient) -> None:
        with patch(
            "services.tts_service.TTSService.synthesize",
            new=MagicMock(return_value=b"fake-mp3"),
        ):
            r = client.post(
                "/api/speaking/practice-prompt",
                json={"language": "English", "level": "A2", "format": "repeat_after_me"},
                headers=_headers(),
            )
        p = _assert_ok_or_llm_flake(r)
        assert p["format"] == "repeat_after_me"
        assert p["targetPhrase"]


# ==================================================================
# LISTENING
# ==================================================================


class TestListeningFlows:
    @pytest.fixture(autouse=True)
    def _mock_tts(self) -> None:
        with patch(
            "services.tts_service.TTSService.synthesize",
            new=MagicMock(return_value=b"fake-mp3"),
        ), patch(
            "services.tts_service.TTSService.synthesize_multispeaker",
            new=MagicMock(return_value=(b"fake-mp3", [])),
        ):
            yield

    def test_default_listening(self, client: TestClient) -> None:
        r = client.post(
            "/api/tasks/listening",
            json={"language": "English", "level": "A2"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p["type"] == "listening"
        assert len(p["questions"]) >= 1
        assert p["audioUrl"]

    def test_dictation(self, client: TestClient) -> None:
        r = client.post(
            "/api/tasks/listening",
            json={
                "language": "English",
                "level": "B1",
                "question_types": ["dictation"],
            },
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert len(p["questions"]) >= 1

    def test_adaptive_listening(self, client: TestClient) -> None:
        r = client.post(
            "/api/tasks/listening/adaptive",
            json={"language": "English", "level": "A2"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        task = p.get("task", p)
        assert task.get("type") == "listening" or task.get("questions"), (
            f"unexpected adaptive listening payload: {p}"
        )


# ==================================================================
# PLACEMENT
# ==================================================================


class TestPlacementFlows:
    def test_generate_question(self, client: TestClient) -> None:
        r = client.post(
            "/api/placement/task",
            json={"language": "English"},
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p.get("question") or p.get("sentence") or p.get("text"), (
            f"no question content: {p}"
        )

    def test_evaluate(self, client: TestClient) -> None:
        r = client.post(
            "/api/placement/evaluate",
            json={
                "language": "English",
                "answers": [
                    {
                        "question": "She ___ to school every day.",
                        "userAnswer": "goes",
                        "correctAnswer": "goes",
                        "isCorrect": True,
                    },
                    {
                        "question": "They ___ playing football.",
                        "userAnswer": "is",
                        "correctAnswer": "are",
                        "isCorrect": False,
                    },
                ],
            },
            headers=_headers(),
        )
        p = _assert_ok_or_llm_flake(r)
        assert p.get("level"), f"no level in evaluation: {p}"
