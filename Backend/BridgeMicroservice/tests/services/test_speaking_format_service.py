"""Tests for the Phase 3 format-driven speaking flow.

Covers:
  - Per-format prompt generation (timed_response, picture_description,
    free_monologue, repeat_after_me, read_aloud).
  - Format-aware grading: WER-based for repeat_after_me, LLM-rubric
    for everything else.
  - The _word_error_rate helper at the unit level.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from services.speaking_service import (
    SpeakingService,
    _word_error_rate,
    _tokens,
    _build_pollinations_url,
    _dedupe_translation,
)
from models.responses.speaking_format_response import (
    SpeakingPromptResponse,
    SpeakingGradeResponse,
    FORMAT_DEFAULT_DURATION,
    FORMAT_RUBRIC_HINTS,
    is_known_format,
)
from models.dtos.speaking_analysis_dtos import (
    WhisperTranscriptionResult,
    WhisperSegment,
    WhisperWord,
)


@pytest.fixture
def mock_ai_service() -> MagicMock:
    svc = MagicMock()
    svc.get_ai_response = AsyncMock()
    return svc


@pytest.fixture
def speaking_service(mock_ai_service: MagicMock) -> SpeakingService:
    return SpeakingService(mock_ai_service)


# ---------- Helpers / format catalog ------------------------------


def test_is_known_format() -> None:
    assert is_known_format("read_aloud")
    assert is_known_format("timed_response")
    assert is_known_format("repeat_after_me")
    assert is_known_format("picture_description")
    assert is_known_format("free_monologue")
    assert not is_known_format("nonsense")


def test_default_duration_covers_every_format() -> None:
    expected = {
        "read_aloud",
        "timed_response",
        "repeat_after_me",
        "picture_description",
        "free_monologue",
    }
    assert set(FORMAT_DEFAULT_DURATION.keys()) == expected
    for v in FORMAT_DEFAULT_DURATION.values():
        assert isinstance(v, int) and v > 0


def test_rubric_hints_cover_every_format() -> None:
    expected = {
        "read_aloud",
        "timed_response",
        "repeat_after_me",
        "picture_description",
        "free_monologue",
    }
    assert set(FORMAT_RUBRIC_HINTS.keys()) == expected
    for hints in FORMAT_RUBRIC_HINTS.values():
        assert isinstance(hints, list) and len(hints) >= 1


# ---------- WER helper --------------------------------------------


def test_tokens_strips_punct_and_lowercases() -> None:
    assert _tokens("Hello, World!") == ["hello", "world"]


def test_word_error_rate_zero_for_identical() -> None:
    assert _word_error_rate("She left for Madrid.", "she LEFT for Madrid") == 0.0


def test_word_error_rate_one_substitution() -> None:
    # 5-word reference, 1 substitution → WER = 1/5 = 0.2
    wer = _word_error_rate(
        "She left for Madrid today.", "She left for Berlin today."
    )
    assert wer == pytest.approx(0.2)


def test_word_error_rate_full_mismatch() -> None:
    wer = _word_error_rate("alpha beta gamma", "x y z")
    assert wer == pytest.approx(1.0)


def test_word_error_rate_empty_reference() -> None:
    assert _word_error_rate("", "anything") == 1.0
    assert _word_error_rate("", "") == 0.0


# ---------- Prompt generation per format --------------------------


@pytest.mark.asyncio
async def test_generate_prompt_timed_response(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {"question": "What's a meal you cook well?", "translation": "Что ты хорошо готовишь?"}
    )
    out = await speaking_service.generate_speaking_prompt(
        language="English", level="B1", format="timed_response"
    )
    assert isinstance(out, SpeakingPromptResponse)
    assert out.format == "timed_response"
    assert "meal" in out.prompt
    assert out.durationSeconds == FORMAT_DEFAULT_DURATION["timed_response"]
    assert out.rubricHints == FORMAT_RUBRIC_HINTS["timed_response"]


@pytest.mark.asyncio
async def test_generate_prompt_picture_description_includes_image_url(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    """picture_description must return:
      - the scene caption as `prompt` (for alt-text + fallback),
      - an `imageUrl` pointing at Pollinations.ai so the FE can
        render an actual photograph the learner describes.
    The whole point of this format is "describe what you SEE", not
    "describe this paragraph"; without imageUrl we'd be back to the
    earlier broken UX."""
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "visual_prompt": "candid photo of a busy coffee shop on a rainy Saturday, photorealistic",
            "scene": "A busy coffee shop on a rainy Saturday morning.",
            "translation": "",
        }
    )
    out = await speaking_service.generate_speaking_prompt(
        language="English", level="B2", format="picture_description"
    )
    assert out.format == "picture_description"
    assert "coffee" in out.prompt
    assert out.durationSeconds == 60
    assert out.imageUrl, "picture_description MUST include an imageUrl"
    assert out.imageUrl.startswith("https://image.pollinations.ai/prompt/")
    # The visual_prompt key terms should be URL-encoded into the path,
    # not silently dropped.
    assert "coffee" in out.imageUrl


@pytest.mark.asyncio
async def test_generate_prompt_picture_description_falls_back_when_visual_prompt_missing(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    """If the LLM forgets `visual_prompt`, we still render an image
    by URL-encoding the scene caption. The URL must be valid and
    non-empty either way."""
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "scene": "A family at a picnic in the park.",
            "translation": "",
        }
    )
    out = await speaking_service.generate_speaking_prompt(
        language="English", level="A2", format="picture_description"
    )
    assert out.imageUrl
    assert "picnic" in out.imageUrl


def test_pollinations_url_encodes_special_chars() -> None:
    """Spaces, accents and quotes must be URL-encoded so the GET
    reaches Pollinations intact instead of being truncated by a proxy."""
    url = _build_pollinations_url("a café & a baguette, Paris")
    assert url.startswith("https://image.pollinations.ai/prompt/")
    assert "%20" in url or "%" in url  # at least one encoding occurred
    assert "model=flux" in url
    assert "nologo=true" in url


def test_pollinations_url_clamps_long_prompts() -> None:
    """Pollinations rejects URLs above ~2KB. We cap the prompt at
    600 chars so the encoded URL stays well inside that ceiling."""
    long_prompt = "lorem ipsum " * 200  # ~2400 chars raw
    url = _build_pollinations_url(long_prompt)
    # The path segment after /prompt/ shouldn't blow past ~1800 chars
    # encoded (3× headroom for %20s).
    path_segment = url.split("/prompt/", 1)[1].split("?", 1)[0]
    assert len(path_segment) <= 1800


def test_pollinations_url_handles_empty_input() -> None:
    """Defensive: empty or whitespace-only prompt must still produce
    a working URL (with a placeholder)."""
    url = _build_pollinations_url("")
    assert url.startswith("https://image.pollinations.ai/prompt/")


def test_dedupe_translation_drops_identical() -> None:
    """When the LLM returns the same string in `prompt` and
    `translation` (UI lang == target lang case), we hide the
    translation so the FE doesn't render the same paragraph twice."""
    assert _dedupe_translation("Hello", "Hello") == ""
    assert _dedupe_translation("Hello", " hello ") == ""  # case + whitespace


def test_dedupe_translation_keeps_real_translation() -> None:
    assert _dedupe_translation("Hello world", "Witam świat") == "Witam świat"
    assert _dedupe_translation("Hello", "") == ""


@pytest.mark.asyncio
async def test_generate_prompt_free_monologue(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {"topic": "Should everyone be required to learn a foreign language?"}
    )
    out = await speaking_service.generate_speaking_prompt(
        language="English", level="C1", format="free_monologue"
    )
    assert out.format == "free_monologue"
    assert out.durationSeconds == FORMAT_DEFAULT_DURATION["free_monologue"]


@pytest.mark.asyncio
async def test_generate_prompt_repeat_after_me_with_tts(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {"phrase": "I would like a coffee, please.", "focus": "modal politeness", "translation": "Можно мне кофе?"}
    )
    fake_tts = MagicMock(return_value=b"mp3-bytes")

    with patch("services.speaking_service.os.makedirs"), patch(
        "services.speaking_service.aiofiles.open"
    ) as mock_open:
        ctx = MagicMock()
        ctx.__aenter__.return_value = AsyncMock()
        ctx.__aexit__.return_value = None
        mock_open.return_value = ctx

        out = await speaking_service.generate_speaking_prompt(
            language="English",
            level="A2",
            format="repeat_after_me",
            tts_synthesizer=fake_tts,
        )

    assert out.format == "repeat_after_me"
    assert out.targetPhrase == "I would like a coffee, please."
    assert out.audioUrl is not None
    fake_tts.assert_called_once()


@pytest.mark.asyncio
async def test_generate_prompt_repeat_after_me_without_tts(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    """When the synthesizer isn't injected, audioUrl falls back to None
    but the prompt still works as a text-only practice."""
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {"phrase": "Hello world.", "focus": "x", "translation": "y"}
    )
    out = await speaking_service.generate_speaking_prompt(
        language="English", level="A1", format="repeat_after_me"
    )
    assert out.audioUrl is None
    assert out.targetPhrase == "Hello world."


@pytest.mark.asyncio
async def test_generate_prompt_unknown_format_raises(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        await speaking_service.generate_speaking_prompt(
            language="English", level="A1", format="something_weird"
        )


# ---------- Grading per format ------------------------------------


def _whisper_transcription(text: str) -> WhisperTranscriptionResult:
    return WhisperTranscriptionResult(
        text=text,
        language="en",
        segments=[
            WhisperSegment(
                id=0,
                start=0.0,
                end=2.0,
                text=text,
                avg_logprob=-0.2,  # high confidence
                no_speech_prob=0.05,
            )
        ],
        words=[
            WhisperWord(word=w, start=0.0 + i * 0.3, end=0.2 + i * 0.3)
            for i, w in enumerate(text.split())
        ],
        raw_response={},
    )


@pytest.mark.asyncio
async def test_grade_repeat_after_me_perfect_match(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    target = "I would like a coffee please"
    transcribed = "I would like a coffee please"
    speaking_service._transcribe_audio_with_whisper = AsyncMock(
        return_value=_whisper_transcription(transcribed)
    )

    out = await speaking_service.grade_speaking_response(
        audio_file_bytes=b"audio",
        filename="x.webm",
        language="English",
        format="repeat_after_me",
        prompt_text=target,
        target_phrase=target,
    )

    assert isinstance(out, SpeakingGradeResponse)
    assert out.matchPercent == 100.0
    assert out.wordErrorRate == 0.0
    # No LLM call: WER path is fully deterministic.
    mock_ai_service.get_ai_response.assert_not_called()


@pytest.mark.asyncio
async def test_grade_repeat_after_me_partial_match(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    target = "She left for Madrid today"  # 5 words
    transcribed = "She left for Berlin today"  # 1 substitution
    speaking_service._transcribe_audio_with_whisper = AsyncMock(
        return_value=_whisper_transcription(transcribed)
    )

    out = await speaking_service.grade_speaking_response(
        audio_file_bytes=b"audio",
        filename="x.webm",
        language="English",
        format="repeat_after_me",
        prompt_text=target,
        target_phrase=target,
    )
    # 1/5 errors → WER 0.2 → 80% match
    assert out.wordErrorRate == 0.2
    assert out.matchPercent == 80.0


@pytest.mark.asyncio
async def test_grade_timed_response_uses_llm_rubric(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    speaking_service._transcribe_audio_with_whisper = AsyncMock(
        return_value=_whisper_transcription(
            "I cook pasta. It is easy. I learned from my grandmother."
        )
    )
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "overall_assessment": "Good answer with concrete details.",
            "positive_points": ["clear narrative", "personal touch"],
            "areas_for_improvement": ["use a wider tense range"],
            "identified_errors": [],
            "content_score": 75,
        }
    )

    out = await speaking_service.grade_speaking_response(
        audio_file_bytes=b"audio",
        filename="x.webm",
        language="English",
        format="timed_response",
        prompt_text="What's a meal you cook well?",
    )
    assert out.format == "timed_response"
    assert out.contentScore == 75
    # Coherence/vocabulary are NOT requested for timed_response, so
    # they stay None even if the LLM returned them.
    assert out.coherenceScore is None


@pytest.mark.asyncio
async def test_grade_picture_description_emits_all_three_scores(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    speaking_service._transcribe_audio_with_whisper = AsyncMock(
        return_value=_whisper_transcription(
            "There is a busy coffee shop. People are sitting at tables drinking."
        )
    )
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "overall_assessment": "Good description.",
            "positive_points": [],
            "areas_for_improvement": [],
            "identified_errors": [],
            "content_score": 70,
            "coherence_score": 65,
            "vocabulary_score": 60,
        }
    )

    out = await speaking_service.grade_speaking_response(
        audio_file_bytes=b"audio",
        filename="x.webm",
        language="English",
        format="picture_description",
        prompt_text="A busy coffee shop on a Saturday.",
    )
    assert out.contentScore == 70
    assert out.coherenceScore == 65
    assert out.vocabularyScore == 60


@pytest.mark.asyncio
async def test_grade_returns_empty_response_for_silent_audio(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    speaking_service._transcribe_audio_with_whisper = AsyncMock(
        return_value=_whisper_transcription("   ")
    )
    out = await speaking_service.grade_speaking_response(
        audio_file_bytes=b"audio",
        filename="x.webm",
        language="English",
        format="timed_response",
        prompt_text="Anything",
    )
    assert out.transcription == ""
    assert "Could not transcribe" in out.overallAssessment
    mock_ai_service.get_ai_response.assert_not_called()


@pytest.mark.asyncio
async def test_grade_rejects_empty_audio(
    speaking_service: SpeakingService,
) -> None:
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await speaking_service.grade_speaking_response(
            audio_file_bytes=b"",
            filename="x.webm",
            language="English",
            format="timed_response",
            prompt_text="x",
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_grade_recovers_from_bad_llm_json(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    """Garbage JSON from the LLM shouldn't crash the whole flow —
    we still want pronunciation metrics + a friendly placeholder."""
    speaking_service._transcribe_audio_with_whisper = AsyncMock(
        return_value=_whisper_transcription("Some real transcript here.")
    )
    mock_ai_service.get_ai_response.return_value = "not valid json at all"

    out = await speaking_service.grade_speaking_response(
        audio_file_bytes=b"audio",
        filename="x.webm",
        language="English",
        format="timed_response",
        prompt_text="x",
    )
    assert out.transcription == "Some real transcript here."
    assert out.contentScore is None
    assert "Could not parse" in out.overallAssessment
