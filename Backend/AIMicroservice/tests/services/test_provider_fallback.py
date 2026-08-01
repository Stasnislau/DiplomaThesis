"""Which key a call uses when the learner has configured little or nothing.

Two failures sat here. Speech transcription read GROQ_API_KEY from the host
environment and never looked at the key the learner had saved, so a learner
with Groq configured still met a 500 whenever the host had no key. Separately,
a learner with no stored key at all met a 400 instead of falling through to
the system key, because the lookup raised before the fallback could run.
"""

import os
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from services.ai_service import AI_Service
from services.speaking_service import SpeakingService
from utils.user_context import UserContext


LEARNER = UserContext(
    user_id="11111111-1111-1111-1111-111111111111",
    user_email="a@b.c",
    user_role="USER",
    authorization="Bearer t",
)


@pytest.fixture
def speaking():
    svc = SpeakingService.__new__(SpeakingService)
    svc.user_service = AsyncMock()
    return svc


@pytest.fixture
def ai():
    svc = AI_Service.__new__(AI_Service)
    svc.user_service = AsyncMock()
    return svc


class TestTranscriptionKey:
    @pytest.mark.asyncio
    async def test_prefers_the_key_the_learner_stored(self, speaking, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "host-key")
        speaking.user_service.get_default_ai_token.return_value = {
            "aiProviderId": "groq",
            "token": "learner-key",
        }

        assert await speaking._resolve_groq_key(LEARNER) == "learner-key"

    @pytest.mark.asyncio
    async def test_falls_back_to_the_host_key_when_the_learner_has_none(
        self, speaking, monkeypatch
    ):
        monkeypatch.setenv("GROQ_API_KEY", "host-key")
        speaking.user_service.get_default_ai_token.side_effect = HTTPException(
            status_code=400, detail={"code": "USER_TOKENS_EMPTY"}
        )

        assert await speaking._resolve_groq_key(LEARNER) == "host-key"

    @pytest.mark.asyncio
    async def test_ignores_a_stored_key_from_another_provider(self, speaking, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "host-key")
        speaking.user_service.get_default_ai_token.return_value = {
            "aiProviderId": "openai",
            "token": "openai-key",
        }

        assert await speaking._resolve_groq_key(LEARNER) == "host-key"

    @pytest.mark.asyncio
    async def test_returns_nothing_when_neither_side_has_a_key(self, speaking, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        speaking.user_service.get_default_ai_token.side_effect = HTTPException(
            status_code=400, detail={"code": "USER_TOKENS_EMPTY"}
        )

        assert await speaking._resolve_groq_key(LEARNER) is None


class TestGenerationKey:
    @pytest.mark.asyncio
    async def test_a_learner_without_a_stored_key_still_gets_a_model(self, ai):
        ai.user_service.get_default_ai_token.side_effect = HTTPException(
            status_code=400, detail={"code": "USER_TOKENS_EMPTY"}
        )
        captured = {}

        async def fake_completion(**kwargs):
            captured.update(kwargs)
            raise RuntimeError("stop after provider resolution")

        import services.ai_service as module

        original = module.acompletion
        module.acompletion = fake_completion
        try:
            with pytest.raises(Exception):
                await ai.get_ai_response("write one exercise", user_context=LEARNER)
        finally:
            module.acompletion = original

        assert captured.get("model"), "the call never reached a provider"


class TestTranscriptionWiring:
    """The helper above is useless unless transcription actually calls it."""

    @pytest.mark.asyncio
    async def test_the_request_carries_the_learner_key(self, speaking, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "host-key")
        speaking.user_service.get_default_ai_token.return_value = {
            "aiProviderId": "groq",
            "token": "learner-key",
        }
        seen = {}

        class FakeResponse:
            status_code = 200

            @staticmethod
            def json():
                return {"text": "hello", "language": "en", "segments": []}

        class FakeClient:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return False

            async def post(self, url, headers=None, files=None, data=None):
                seen["auth"] = headers["Authorization"]
                return FakeResponse()

        import services.speaking_service as module

        monkeypatch.setattr(module.httpx, "AsyncClient", lambda **kw: FakeClient())

        await speaking._transcribe_audio_with_whisper(b"audio", "a.webm", "en", LEARNER)

        assert seen["auth"] == "Bearer learner-key"
