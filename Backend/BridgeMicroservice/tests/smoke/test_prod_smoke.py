"""Production-grade smoke: hit every Phase 1+2+3 endpoint over real
HTTP via FastAPI TestClient with realistic payloads, mocking only the
external boundaries (AI provider, TTS, Whisper, Vector DB, User DB).

The point isn't to cover business logic (unit tests do that) — it's
to verify the WIRING:

  - Routes are reachable at their expected paths.
  - Auth / X-User-Id headers are honoured by extract_user_context.
  - Request DTOs accept what the FE actually sends (snake_case +
    camelCase aliases).
  - Response payloads round-trip through BaseResponse + their own
    Pydantic models without validation errors.
  - Discriminated-union question shapes parse for every variant.

A passing run here means a fresh deploy will at least not 500 on the
happy path.  Use the local Python smoke for pre-deploy CI; use
scripts/post_deploy_smoke.py for post-deploy verification of the live
URL.
"""

from __future__ import annotations

import io
import json
import os
import time
import uuid
import jwt
from typing import Any, Iterable
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------- Auth setup --------------------------------------------


_TEST_JWT_SECRET = "smoke-test-jwt-secret-for-tests-only"
_TEST_USER_ID = "smoke-user-00000000"


def _make_smoke_token(user_id: str = _TEST_USER_ID) -> str:
    """Mint a real HS256 token signed with the test JWT_SECRET so the
    extract_user_context path runs end-to-end (instead of being
    short-circuited by the internal-service-key fallback)."""
    return jwt.encode(
        {"sub": user_id, "iat": int(time.time())},
        _TEST_JWT_SECRET,
        algorithm="HS256",
    )


def _auth_headers(user_id: str = _TEST_USER_ID, ui_locale: str = "en") -> dict:
    token = _make_smoke_token(user_id)
    return {
        "Authorization": f"Bearer {token}",
        "X-User-Id": user_id,
        "X-User-Email": f"{user_id}@smoketest.local",
        "X-User-Role": "user",
        "X-UI-Locale": ui_locale,
    }


# ---------- Test fixtures: app + boundary mocks --------------------


@pytest.fixture(autouse=True)
def _set_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", _TEST_JWT_SECRET)


@pytest.fixture
def smoke_client(monkeypatch: pytest.MonkeyPatch) -> Iterable[TestClient]:
    """Build the real FastAPI app, then patch its hot-path boundaries:
      - AI provider (litellm.acompletion → mocked AsyncMock)
      - Whisper transcription (httpx call)
      - TTS synth (Google Cloud client)
      - User microservice HTTP (history reads/writes)
      - Vector DB (in-process Mongo replacement)
    Yields a TestClient that responds to all auth-required routes."""
    # Set required env BEFORE importing main (which may read at import time).
    monkeypatch.setenv("PUBLIC_BASE_URL", "http://smoke.test")

    # Patch the user-service HTTP path so log_task_history / history
    # reads don't try to reach a real microservice.
    fake_user_svc_get = AsyncMock(return_value={"success": True, "payload": []})
    fake_user_svc_post = AsyncMock(return_value={"success": True, "payload": {}})

    # Patch vector DB so process_pdf doesn't try to talk to Qdrant.
    fake_vector_db = MagicMock()
    fake_vector_db.save_chunks = MagicMock()
    fake_vector_db.search_materials = MagicMock(return_value=[])

    # Default AI mock — returns a benign DocumentMap-like JSON. Each
    # test overrides via .side_effect when it needs a specific shape.
    fake_ai = AsyncMock(
        return_value=json.dumps(
            {
                "document_kind": "Mixed",
                "exercises": [
                    {
                        "type": "reading_comprehension",
                        "passage_word_count_estimate": 200,
                        "passage_topic_hint": "smoke",
                        "question_count": 1,
                        "question_subtypes": ["main_idea"],
                        "grammar_focus": [],
                        "example": "x",
                    }
                ],
            }
        )
    )

    # TTS — return canned MP3 bytes.
    fake_tts_synth = MagicMock(return_value=b"smoke-mp3-bytes")
    fake_multispeaker = MagicMock(return_value=(b"smoke-mp3-bytes", []))

    # Whisper — also canned. The real one is _transcribe_audio_with_whisper
    # which we patch at the SpeakingService instance level later.
    from main import app  # noqa: WPS433
    from services import (
        ai_service as ai_service_mod,
        tts_service as tts_service_mod,
        listening_task_service as listening_mod,
        material_service as material_mod,
        speaking_service as speaking_mod,
        vector_db_service as vector_db_mod,
    )

    with patch.object(
        ai_service_mod.AI_Service, "get_ai_response", fake_ai
    ), patch.object(
        tts_service_mod.TTSService, "synthesize", fake_tts_synth
    ), patch.object(
        tts_service_mod.TTSService,
        "synthesize_multispeaker",
        fake_multispeaker,
    ), patch.object(
        vector_db_mod, "VectorDBService", return_value=fake_vector_db
    ), patch(
        "services.user_service.UserService.get_recent_history",
        new=AsyncMock(return_value=[]),
    ), patch(
        "services.user_service.UserService.log_task_history",
        new=AsyncMock(return_value=None),
    ), patch(
        "services.listening_task_service.os.makedirs"
    ), patch(
        "services.listening_task_service.aiofiles.open"
    ) as listen_aio, patch(
        "services.speaking_service.os.makedirs"
    ), patch(
        "services.speaking_service.aiofiles.open"
    ) as speak_aio:

        # Async-context-manager stub so `async with aiofiles.open(...)`
        # short-circuits to an in-memory write that succeeds.
        for ao in (listen_aio, speak_aio):
            ctx = MagicMock()
            ctx.__aenter__.return_value = AsyncMock()
            ctx.__aexit__.return_value = None
            ao.return_value = ctx

        # Patch Whisper transcription on the singleton SpeakingService
        # used by the controller. Default: a usable transcript so the
        # downstream LLM path runs.
        from models.dtos.speaking_analysis_dtos import (
            WhisperSegment,
            WhisperTranscriptionResult,
            WhisperWord,
        )

        def _fake_whisper(text: str = "Smoke test transcript here.") -> WhisperTranscriptionResult:
            return WhisperTranscriptionResult(
                text=text,
                language="en",
                segments=[
                    WhisperSegment(
                        id=0,
                        start=0.0,
                        end=2.0,
                        text=text,
                        avg_logprob=-0.2,
                        no_speech_prob=0.05,
                    )
                ],
                words=[
                    WhisperWord(word=w, start=i * 0.3, end=i * 0.3 + 0.2)
                    for i, w in enumerate(text.split())
                ],
                raw_response={},
            )

        # Reach into the actual SpeakingService singleton main.py
        # constructed at import time.
        from main import speaking_service as speaking_singleton

        speaking_singleton._transcribe_audio_with_whisper = AsyncMock(  # type: ignore[method-assign]
            return_value=_fake_whisper()
        )

        client = TestClient(app)
        # Expose the mocks for tests that need to override side_effect.
        client.fake_ai = fake_ai  # type: ignore[attr-defined]
        client.fake_whisper_factory = _fake_whisper  # type: ignore[attr-defined]
        client.fake_tts_multispeaker = fake_multispeaker  # type: ignore[attr-defined]
        client.fake_vector_db = fake_vector_db  # type: ignore[attr-defined]
        yield client


def _payload(resp_json: dict) -> Any:
    """Extract `payload` from BaseResponse, asserting `success`."""
    assert resp_json.get("success") is True, f"BaseResponse not success: {resp_json}"
    return resp_json["payload"]


# ====================================================================
# HEALTH + AUTH + APP SHELL
# ====================================================================


def test_health_ok(smoke_client: TestClient) -> None:
    r = smoke_client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_api_health_ok(smoke_client: TestClient) -> None:
    r = smoke_client.get("/api/health")
    assert r.status_code == 200


def test_protected_endpoint_rejects_no_auth(smoke_client: TestClient) -> None:
    """A protected endpoint without auth must 401, not 500. This is
    what catches a mis-applied middleware in CI."""
    r = smoke_client.post(
        "/api/tasks/listening",
        json={"language": "English", "level": "A1"},
    )
    assert r.status_code in (401, 422), f"Got {r.status_code}: {r.text[:200]}"


def test_protected_endpoint_rejects_forged_user_id(smoke_client: TestClient) -> None:
    """X-User-Id that doesn't match the JWT sub must be rejected."""
    headers = _auth_headers()
    headers["X-User-Id"] = "definitely-not-the-jwt-sub"
    r = smoke_client.post(
        "/api/tasks/listening",
        json={"language": "English", "level": "A1"},
        headers=headers,
    )
    assert r.status_code == 401, f"Got {r.status_code}: {r.text[:200]}"


# ====================================================================
# PHASE 1 — MATERIALS (PDF → DocumentMap → quiz with 7 question types)
# ====================================================================


def _minimal_pdf_bytes() -> bytes:
    """Real PDF the parser will accept. We use reportlab if available
    so process_pdf's pypdf reader sees a clean text page."""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        # Enough text to clear the 30% non-text-share garbled-detector.
        c.drawString(100, 720, "Smoke test reading passage.")
        c.drawString(100, 700, "This passage is for an integration smoke test.")
        c.drawString(100, 680, "It contains plain English sentences only.")
        c.showPage()
        c.save()
        return buf.getvalue()
    except ImportError:
        # Fall back to a bare-minimum PDF stub (won't extract text but
        # is a valid PDF — process_pdf will then raise PDF_NO_TEXT,
        # which is a known clean error path we can still smoke-check).
        return b"%PDF-1.4\n%EOF\n"


def test_phase1_upload_returns_document_map(smoke_client: TestClient) -> None:
    """POST /materials/upload — happy path. The fixture's default AI
    response is already a valid DocumentMap, so this exercises:
      - file upload (multipart),
      - pypdf parsing on a real PDF,
      - classification AI call,
      - DocumentMap parsing,
      - BaseResponse wrapping."""
    pdf = _minimal_pdf_bytes()
    if pdf == b"%PDF-1.4\n%EOF\n":
        pytest.skip("reportlab missing — can't synthesise a real PDF")

    r = smoke_client.post(
        "/api/materials/upload",
        files={"file": ("smoke.pdf", pdf, "application/pdf")},
        headers=_auth_headers(),
    )
    assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
    payload = _payload(r.json())
    assert payload["filename"] == "smoke.pdf"
    assert payload["status"] == "success"
    # The FE round-trips this back into /materials/quiz, so the wire
    # shape must include `document_map`.
    assert "document_map" in payload, payload.keys()


def test_phase1_quiz_round_trips_document_map_and_parses_all_7_types(
    smoke_client: TestClient,
) -> None:
    """POST /materials/quiz — given a DocumentMap, must produce a
    QuizContent with each of the 7 discriminated-union variants."""
    smoke_client.fake_vector_db.search_materials = MagicMock(
        return_value=[
            type(
                "Chunk",
                (),
                {"text": "Smoke chunk text about birds.", "source": "x", "chunk_index": 0},
            )()
        ]
    )

    # The pipeline calls AI: 1× per stimulus + 1× per questions.
    # exercise has stimulus → 2 calls. We give each call the right
    # canned JSON via side_effect.
    stimulus_json = json.dumps({"passage": "A short generated passage about birds."})
    seven_questions_json = json.dumps(
        {
            "questions": [
                {
                    "type": "multiple_choice",
                    "question": "MC?",
                    "options": ["a", "b", "c"],
                    "correct_answer": "a",
                    "context_text": None,
                },
                {
                    "type": "open",
                    "question": "Open?",
                    "options": [],
                    "correct_answer": "x",
                    "context_text": None,
                },
                {
                    "type": "fill_in_the_blank",
                    "question": "She ___ home.",
                    "options": [],
                    "correct_answer": "went",
                    "context_text": None,
                },
                {
                    "type": "true_false",
                    "question": "Birds fly.",
                    "correct_answer": "true",
                    "context_text": None,
                },
                {
                    "type": "matching",
                    "question": "Match.",
                    "pairs": [
                        {"left": "a", "right": "b"},
                        {"left": "c", "right": "d"},
                    ],
                    "context_text": None,
                },
                {
                    "type": "multi_select_mc",
                    "question": "Multi.",
                    "options": ["A", "B", "C", "D"],
                    "correct_answers": ["A", "B"],
                    "context_text": None,
                },
                {
                    "type": "cloze_passage",
                    "question": "Fill blanks.",
                    "passage_with_blanks": "Birds fly {{1}} for {{2}}.",
                    "blanks": [
                        {"id": "1", "correct_answer": "south"},
                        {"id": "2", "correct_answer": "winter"},
                    ],
                    "context_text": None,
                },
            ]
        }
    )
    smoke_client.fake_ai.side_effect = [stimulus_json, seven_questions_json]

    document_map = {
        "document_kind": "Mixed",
        "exercises": [
            {
                "type": "reading_comprehension",
                "passage_word_count_estimate": 200,
                "passage_topic_hint": "birds",
                "question_count": 7,
                "question_subtypes": ["main_idea"],
                "grammar_focus": [],
                "example": "",
            }
        ],
    }
    r = smoke_client.post(
        "/api/materials/quiz",
        json={"document_map": document_map},
        headers=_auth_headers(),
    )
    assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
    payload = _payload(r.json())
    quiz = payload["quiz"]
    assert isinstance(quiz, dict), f"quiz must be QuizContent dict, got {type(quiz)}"
    questions = quiz["questions"]
    assert len(questions) == 7, f"expected 7 question variants, got {len(questions)}"
    types_seen = {q["type"] for q in questions}
    assert types_seen == {
        "multiple_choice",
        "open",
        "fill_in_the_blank",
        "true_false",
        "matching",
        "multi_select_mc",
        "cloze_passage",
    }, f"Variants missed: {types_seen}"


# ====================================================================
# PHASE 2 — LISTENING (6 question types + multi-speaker TTS)
# ====================================================================


def test_phase2_listening_default_mix(smoke_client: TestClient) -> None:
    """Default request (no question_types) — historic MC + FIB shape."""
    smoke_client.fake_ai.return_value = json.dumps(
        {
            "transcript": "Once upon a time there was a fox.",
            "questions": [
                {
                    "type": "multiple_choice",
                    "question": "Animal?",
                    "options": ["fox", "wolf"],
                    "correctAnswer": "fox",
                },
                {
                    "type": "fill_in_the_blank",
                    "question": "There was a ___.",
                    "correctAnswer": "fox",
                },
            ],
        }
    )
    r = smoke_client.post(
        "/api/tasks/listening",
        json={"language": "English", "level": "A2"},
        headers=_auth_headers(),
    )
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    payload = _payload(r.json())
    assert payload["type"] == "listening"
    assert payload["audioUrl"].endswith(".mp3")
    types_seen = {q["type"] for q in payload["questions"]}
    assert types_seen == {"multiple_choice", "fill_in_the_blank"}


def test_phase2_listening_accepts_camelcase_question_types(
    smoke_client: TestClient,
) -> None:
    """The DTO has alias_generator=to_camel + populate_by_name. The FE
    sends `question_types` (snake_case) but a hand-coded curl call
    might send `questionTypes` (camelCase) — both must work."""
    smoke_client.fake_ai.return_value = json.dumps(
        {
            "transcript": "Sample.",
            "questions": [
                {
                    "type": "dictation",
                    "question": "Type what you heard.",
                    "correctAnswer": "Sample.",
                }
            ],
        }
    )
    r = smoke_client.post(
        "/api/tasks/listening",
        json={
            "language": "English",
            "level": "A1",
            "questionTypes": ["dictation"],
        },
        headers=_auth_headers(),
    )
    assert r.status_code == 200, r.text[:300]
    types_seen = {q["type"] for q in _payload(r.json())["questions"]}
    assert types_seen == {"dictation"}


def test_phase2_listening_multi_speaker_routes_to_multispeaker_tts(
    smoke_client: TestClient,
) -> None:
    """Transcript with [Speaker N]: tags must trigger
    synthesize_multispeaker, and the speakers list must bubble up."""
    smoke_client.fake_tts_multispeaker.return_value = (
        b"multi-mp3",
        ["Speaker 1", "Speaker 2"],
    )
    smoke_client.fake_ai.return_value = json.dumps(
        {
            "transcript": (
                "[Speaker 1]: Solar power is the future.\n"
                "[Speaker 2]: I disagree, wind is more reliable here."
            ),
            "questions": [
                {
                    "type": "multi_speaker_matching",
                    "question": "Who said what?",
                    "speakers": ["Speaker 1", "Speaker 2"],
                    "statements": [
                        {"statement": "Solar.", "correctSpeaker": "Speaker 1"},
                        {"statement": "Wind.", "correctSpeaker": "Speaker 2"},
                    ],
                }
            ],
        }
    )
    r = smoke_client.post(
        "/api/tasks/listening",
        json={
            "language": "English",
            "level": "B2",
            "question_types": ["multi_speaker_matching"],
        },
        headers=_auth_headers(),
    )
    assert r.status_code == 200, r.text[:300]
    payload = _payload(r.json())
    assert payload["speakers"] == ["Speaker 1", "Speaker 2"]
    smoke_client.fake_tts_multispeaker.assert_called_once()


@pytest.mark.parametrize(
    "qtype, ans_field, ans_value",
    [
        ("multiple_choice", "correctAnswer", "a"),
        ("fill_in_the_blank", "correctAnswer", "x"),
        ("dictation", "correctAnswer", "x"),
        ("true_false_not_given", "correctAnswer", "not_given"),
        ("sentence_completion", "correctAnswer", "x"),
    ],
)
def test_phase2_listening_each_simple_type_round_trips(
    smoke_client: TestClient, qtype: str, ans_field: str, ans_value: str
) -> None:
    """Each non-pair listening type must serialise + deserialise via
    ListeningQuestionAdapter without dropping fields."""
    base = {"type": qtype, "question": "Q?"}
    if qtype == "multiple_choice":
        base["options"] = ["a", "b"]
    base[ans_field] = ans_value
    smoke_client.fake_ai.return_value = json.dumps(
        {"transcript": "Smoke transcript.", "questions": [base]}
    )
    r = smoke_client.post(
        "/api/tasks/listening",
        json={
            "language": "English",
            "level": "A1",
            "question_types": [qtype],
        },
        headers=_auth_headers(),
    )
    assert r.status_code == 200, f"{qtype} failed: {r.text[:300]}"
    questions = _payload(r.json())["questions"]
    assert len(questions) == 1 and questions[0]["type"] == qtype


# ====================================================================
# PHASE 3 — SPEAKING (5 formats: read_aloud, timed, repeat, picture, monologue)
# ====================================================================


@pytest.mark.parametrize(
    "fmt, returned_field",
    [
        ("timed_response", "question"),
        ("picture_description", "scene"),
        ("free_monologue", "topic"),
    ],
)
def test_phase3_practice_prompt_per_format(
    smoke_client: TestClient, fmt: str, returned_field: str
) -> None:
    """POST /speaking/practice-prompt must return a SpeakingPromptResponse
    with the right durationSeconds + rubricHints for the format."""
    smoke_client.fake_ai.return_value = json.dumps(
        {returned_field: f"Smoke prompt for {fmt}", "translation": ""}
    )
    r = smoke_client.post(
        "/api/speaking/practice-prompt",
        json={"language": "English", "level": "B1", "format": fmt},
        headers=_auth_headers(),
    )
    assert r.status_code == 200, f"{fmt}: {r.text[:300]}"
    payload = _payload(r.json())
    assert payload["format"] == fmt
    assert payload["prompt"]
    assert payload["durationSeconds"] > 0
    assert isinstance(payload["rubricHints"], list)


def test_phase3_practice_prompt_repeat_after_me_includes_audio(
    smoke_client: TestClient,
) -> None:
    """repeat_after_me wires TTSService.synthesize → audioUrl."""
    smoke_client.fake_ai.return_value = json.dumps(
        {
            "phrase": "Could I have a coffee, please?",
            "focus": "modal politeness",
            "translation": "Можно мне кофе?",
        }
    )
    r = smoke_client.post(
        "/api/speaking/practice-prompt",
        json={
            "language": "English",
            "level": "A2",
            "format": "repeat_after_me",
        },
        headers=_auth_headers(),
    )
    assert r.status_code == 200, r.text[:300]
    payload = _payload(r.json())
    assert payload["targetPhrase"] == "Could I have a coffee, please?"
    assert payload["audioUrl"], "repeat_after_me must include a TTS audio URL"


def test_phase3_grade_response_repeat_after_me_uses_wer(
    smoke_client: TestClient,
) -> None:
    """repeat_after_me grading is deterministic WER vs target phrase
    — the LLM should NOT be called for this format."""
    target = "She left for Madrid on Tuesday morning."
    fake_factory = smoke_client.fake_whisper_factory
    from main import speaking_service as speaking_singleton

    speaking_singleton._transcribe_audio_with_whisper = AsyncMock(  # type: ignore[method-assign]
        return_value=fake_factory(target),
    )
    smoke_client.fake_ai.reset_mock()

    r = smoke_client.post(
        "/api/speaking/grade-response",
        files={"audio_file": ("smoke.webm", b"audio-bytes", "audio/webm")},
        params={
            "language": "English",
            "format": "repeat_after_me",
            "promptText": target,
            "targetPhrase": target,
        },
        headers=_auth_headers(),
    )
    assert r.status_code == 200, r.text[:300]
    payload = _payload(r.json())
    assert payload["matchPercent"] == 100.0
    assert payload["wordErrorRate"] == 0.0
    smoke_client.fake_ai.assert_not_called()


def test_phase3_grade_response_timed_response_uses_llm_rubric(
    smoke_client: TestClient,
) -> None:
    """Content-graded format → LLM is called once for rubric scoring."""
    smoke_client.fake_ai.return_value = json.dumps(
        {
            "overall_assessment": "Solid answer with concrete details.",
            "positive_points": ["clear structure"],
            "areas_for_improvement": ["wider tense range"],
            "identified_errors": [],
            "content_score": 75,
        }
    )
    r = smoke_client.post(
        "/api/speaking/grade-response",
        files={"audio_file": ("smoke.webm", b"audio-bytes", "audio/webm")},
        params={
            "language": "English",
            "format": "timed_response",
            "promptText": "What's a meal you cook well?",
        },
        headers=_auth_headers(),
    )
    assert r.status_code == 200, r.text[:300]
    payload = _payload(r.json())
    assert payload["format"] == "timed_response"
    assert payload["contentScore"] == 75


def test_phase3_grade_response_rejects_unknown_format(
    smoke_client: TestClient,
) -> None:
    """Defensive: an unknown format must surface a 400 with a known
    error code, not 500 with a stack trace."""
    r = smoke_client.post(
        "/api/speaking/grade-response",
        files={"audio_file": ("x.webm", b"a", "audio/webm")},
        params={
            "language": "English",
            "format": "made_up_format",
            "promptText": "x",
        },
        headers=_auth_headers(),
    )
    assert r.status_code == 400, r.text[:300]


# ====================================================================
# CROSS-PHASE: localization, error contracts
# ====================================================================


def test_locale_header_drives_ui_language_in_prompt(
    smoke_client: TestClient,
) -> None:
    """X-UI-Locale: pl must reach the AI prompt as a Polish hint.
    We assert by inspecting the kwargs the AI mock receives."""
    smoke_client.fake_ai.return_value = json.dumps(
        {"question": "Co gotujesz najlepiej?", "translation": ""}
    )
    smoke_client.post(
        "/api/speaking/practice-prompt",
        json={"language": "English", "level": "B1", "format": "timed_response"},
        headers=_auth_headers(ui_locale="pl"),
    )
    # The first prompt-generator call wraps "Polish" into the
    # translation slot — find that string in any call's prompt arg.
    found_polish = False
    for call in smoke_client.fake_ai.await_args_list:
        prompt_text = call.kwargs.get("prompt", "") + " ".join(str(a) for a in call.args)
        if "Polish" in prompt_text:
            found_polish = True
            break
    assert found_polish, "X-UI-Locale: pl did not surface as 'Polish' in the prompt"


# ====================================================================
# RESULT-LOGGING ENDPOINTS (history + adaptive feed)
# ====================================================================


def test_listening_result_endpoint_writes_history(
    smoke_client: TestClient,
) -> None:
    """POST /tasks/listening/result must accept the FE's session
    summary and call user_service.log_task_history with the metadata
    fields derive_adaptive_focus reads (errorTypes / errorExamples /
    weaknesses). Until this endpoint existed, listening sessions
    never reached the history table at all."""
    from unittest.mock import AsyncMock, patch

    log_mock = AsyncMock(return_value=None)
    with patch(
        "services.user_service.UserService.log_task_history", new=log_mock
    ):
        r = smoke_client.post(
            "/api/tasks/listening/result",
            json={
                "language": "English",
                "level": "B1",
                "score": 50,
                "questionCount": 4,
                "correctCount": 2,
                "questionTypes": ["multiple_choice", "dictation"],
                "errorExamples": [
                    {
                        "type": "dictation",
                        "text": "Type what you heard.",
                        "suggestion": "She left for Madrid on Tuesday.",
                    }
                ],
            },
            headers=_auth_headers(),
        )

    assert r.status_code == 200, r.text[:300]
    log_mock.assert_awaited_once()
    payload = log_mock.await_args.args[1]
    assert payload["taskType"] == "listening"
    assert payload["score"] == 50
    meta = payload["metadata"]
    # The adaptive consumer reads these three blindly across all
    # task types — verify the contract is honoured here.
    assert meta["errorTypes"] == ["dictation"]
    assert meta["errorExamples"][0]["text"] == "Type what you heard."
    # weaknesses gets populated for low scores so the next
    # adaptive call sees "listening comprehension" as a target.
    assert "listening comprehension" in meta["weaknesses"]


def test_listening_result_high_score_omits_weaknesses(
    smoke_client: TestClient,
) -> None:
    """If the user nailed the session (score>=60), we don't pollute
    `weaknesses` with the generic 'listening comprehension' tag —
    that would derail adaptive logic into drilling something the
    user already mastered."""
    from unittest.mock import AsyncMock, patch

    log_mock = AsyncMock(return_value=None)
    with patch(
        "services.user_service.UserService.log_task_history", new=log_mock
    ):
        r = smoke_client.post(
            "/api/tasks/listening/result",
            json={
                "language": "English",
                "level": "B2",
                "score": 90,
                "questionCount": 5,
                "correctCount": 4,
                "questionTypes": ["multiple_choice"],
                "errorExamples": [],
            },
            headers=_auth_headers(),
        )
    assert r.status_code == 200
    payload = log_mock.await_args.args[1]
    assert payload["metadata"]["weaknesses"] == []


def test_materials_result_endpoint_writes_history(
    smoke_client: TestClient,
) -> None:
    """POST /materials/result fills the gap where /materials/quiz
    logged the GENERATION (score=null) but never the actual
    per-session score. Adaptive needs the latter."""
    from unittest.mock import AsyncMock, patch

    log_mock = AsyncMock(return_value=None)
    with patch(
        "services.user_service.UserService.log_task_history", new=log_mock
    ):
        r = smoke_client.post(
            "/api/materials/result",
            json={
                "language": "English",
                "score": 40,
                "questionCount": 5,
                "correctCount": 2,
                "questionTypes": ["multiple_choice", "true_false"],
                "errorExamples": [
                    {
                        "type": "true_false",
                        "text": "Birds never migrate.",
                        "suggestion": "false",
                    }
                ],
                "documentKind": "TOEFL_Reading",
            },
            headers=_auth_headers(),
        )

    assert r.status_code == 200, r.text[:300]
    log_mock.assert_awaited_once()
    payload = log_mock.await_args.args[1]
    assert payload["taskType"] == "materials"
    assert payload["score"] == 40
    meta = payload["metadata"]
    assert meta["errorTypes"] == ["true_false"]
    assert meta["documentKind"] == "TOEFL_Reading"
    # Low score → weakness recorded with documentKind, so adaptive
    # can target the same kind of material next time.
    assert any("TOEFL_Reading" in w for w in meta["weaknesses"])


def test_materials_result_truncates_long_error_text(
    smoke_client: TestClient,
) -> None:
    """Defence: ridiculously long question text or suggestion must be
    capped at 160 chars to keep adaptive prompts inside the LLM
    context budget."""
    from unittest.mock import AsyncMock, patch

    log_mock = AsyncMock(return_value=None)
    long_text = "x" * 500
    with patch(
        "services.user_service.UserService.log_task_history", new=log_mock
    ):
        smoke_client.post(
            "/api/materials/result",
            json={
                "score": 50,
                "questionCount": 1,
                "correctCount": 0,
                "errorExamples": [
                    {
                        "type": "multiple_choice",
                        "text": long_text,
                        "suggestion": long_text,
                    }
                ],
            },
            headers=_auth_headers(),
        )
    err = log_mock.await_args.args[1]["metadata"]["errorExamples"][0]
    assert len(err["text"]) <= 160
    assert len(err["suggestion"]) <= 160


def test_structured_error_shape_for_bad_listening_request(
    smoke_client: TestClient,
) -> None:
    """Validation error must produce a structured JSON body the FE
    can parse — not an HTML stack trace. Bridge's custom validation
    handler wraps Pydantic errors in BaseResponse with `success: false`
    and `payload.errors[]`."""
    r = smoke_client.post(
        "/api/tasks/listening",
        json={"level": "A1"},  # missing `language`
        headers=_auth_headers(),
    )
    assert r.status_code == 422
    body = r.json()
    assert body.get("success") is False, f"expected wrapped error, got {body}"
    payload = body["payload"]
    assert "errors" in payload, f"validation payload missing `errors`: {payload}"
    assert any(
        "language" in (err.get("loc") or [])
        for err in payload["errors"]
    ), f"missing-`language` not surfaced in errors: {payload['errors']}"
