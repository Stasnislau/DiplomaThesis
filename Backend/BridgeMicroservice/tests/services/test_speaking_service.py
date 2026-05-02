import json
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException

from services.speaking_service import SpeakingService
from models.responses.speaking_analysis_response import SpeakingAnalysisResponse


@pytest.fixture(autouse=True)
def _set_groq_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "test-key")


@pytest.fixture
def mock_ai_service() -> MagicMock:
    service = MagicMock()
    service.get_ai_response = AsyncMock()
    return service


@pytest.fixture
def speaking_service(mock_ai_service: MagicMock) -> SpeakingService:
    return SpeakingService(mock_ai_service)


def _groq_response(payload: dict, status_code: int = 200) -> MagicMock:
    """Build a mock httpx.Response-like object."""
    response = MagicMock()
    response.status_code = status_code
    response.json = MagicMock(return_value=payload)
    response.text = json.dumps(payload)
    return response


def _patch_httpx(response: MagicMock) -> "patch":
    """Patch httpx.AsyncClient so .post() yields the given response."""
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=response)

    async_ctx = AsyncMock()
    async_ctx.__aenter__.return_value = mock_client
    async_ctx.__aexit__.return_value = None

    return patch(
        "services.speaking_service.httpx.AsyncClient",
        return_value=async_ctx,
    )


@pytest.mark.asyncio
async def test_analyze_user_audio_success(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    groq_payload = {
        "text": "Hello world.",
        "language": "en",
        "segments": [
            {
                "id": 0,
                "seek": 0,
                "start": 0.0,
                "end": 1.5,
                "text": "Hello world.",
                "tokens": [],
                "temperature": 0.0,
                "avg_logprob": -0.2,
                "compression_ratio": 1.0,
                "no_speech_prob": 0.05,
                "words": [
                    {"word": "Hello", "start": 0.0, "end": 0.6},
                    {"word": "world.", "start": 0.7, "end": 1.5},
                ],
            }
        ],
    }

    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "overall_assessment": "Good.",
            "identified_errors": [],
            "positive_points": ["Clear pronunciation"],
            "areas_for_improvement": [],
        }
    )

    with _patch_httpx(_groq_response(groq_payload)):
        result = await speaking_service.analyze_user_audio(
            b"fake-audio", "test.mp3", "English"
        )

    assert isinstance(result, SpeakingAnalysisResponse)
    assert result.transcription == "Hello world."
    assert result.detected_language == "en"
    assert result.overall_assessment == "Good."
    assert result.identified_errors == []
    assert result.pronunciation.overall_confidence > 0.0
    assert result.pronunciation.fluency_score > 0.0
    mock_ai_service.get_ai_response.assert_awaited_once()


@pytest.mark.asyncio
async def test_analyze_user_audio_no_speech(
    speaking_service: SpeakingService, mock_ai_service: MagicMock
) -> None:
    groq_payload = {"text": "  ", "language": "en", "segments": []}

    with _patch_httpx(_groq_response(groq_payload)):
        result = await speaking_service.analyze_user_audio(
            b"silence", "test.webm", "English"
        )

    assert isinstance(result, SpeakingAnalysisResponse)
    assert result.transcription == ""
    assert "Could not transcribe" in result.overall_assessment
    assert result.pronunciation.fluency_score == 0.0
    # AI feedback path must be skipped when transcription is empty
    mock_ai_service.get_ai_response.assert_not_called()


@pytest.mark.asyncio
async def test_analyze_user_audio_groq_provider_error(
    speaking_service: SpeakingService,
) -> None:
    error_response = _groq_response({"error": "rate limited"}, status_code=429)
    error_response.text = "rate limited"

    with _patch_httpx(error_response):
        with pytest.raises(HTTPException) as exc_info:
            await speaking_service.analyze_user_audio(b"audio", "x.mp3", "English")
        assert exc_info.value.status_code == 502
        assert "transcription provider error" in exc_info.value.detail


@pytest.mark.asyncio
async def test_analyze_user_audio_empty_input_rejected(
    speaking_service: SpeakingService,
) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await speaking_service.analyze_user_audio(b"", "x.mp3", "English")
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_analyze_user_audio_missing_groq_key(
    speaking_service: SpeakingService, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(HTTPException) as exc_info:
        await speaking_service.analyze_user_audio(b"audio", "x.mp3", "English")
    assert exc_info.value.status_code == 500
    assert "GROQ_API_KEY" in exc_info.value.detail


def test_pronunciation_metrics_low_confidence_words(
    speaking_service: SpeakingService,
) -> None:
    """avg_logprob below -0.7 in a segment should mark its words as low-confidence."""
    from models.dtos.speaking_analysis_dtos import (
        WhisperTranscriptionResult,
        WhisperSegment,
        WhisperWord,
    )

    transcription = WhisperTranscriptionResult(
        text="muffled speech here",
        language="en",
        segments=[
            WhisperSegment(
                id=0,
                start=0.0,
                end=2.0,
                text="muffled speech here",
                avg_logprob=-1.2,
                no_speech_prob=0.1,
            )
        ],
        words=[
            WhisperWord(word="muffled", start=0.0, end=0.5),
            WhisperWord(word="speech", start=0.6, end=1.2),
            WhisperWord(word="here", start=1.3, end=2.0),
        ],
        raw_response={},
    )

    metrics = speaking_service._compute_pronunciation_metrics(transcription)

    assert metrics.overall_confidence == 0.0  # 1.0 + (-1.2) clamped to 0
    assert metrics.low_confidence_words  # non-empty
    assert metrics.words_per_minute is not None
