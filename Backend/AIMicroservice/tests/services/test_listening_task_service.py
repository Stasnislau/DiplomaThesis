import json
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from services.listening_task_service import ListeningTaskService
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.responses.listening_task_response import (
    ListeningQuestionAdapter,
    ListeningTaskResponse,
    MultipleChoiceQuestion,
    FillInTheBlankQuestion,
    DictationQuestion,
    TrueFalseNotGivenQuestion,
    SentenceCompletionQuestion,
    MultiSpeakerMatchingQuestion,
)
from services.tts_service import _split_by_speaker_tags


@pytest.fixture
def mock_ai_service() -> MagicMock:
    service = MagicMock()
    service.get_ai_response = AsyncMock()
    return service


@pytest.fixture
def listening_service(mock_ai_service: MagicMock) -> ListeningTaskService:
    return ListeningTaskService(mock_ai_service)


def _patch_audio_pipeline(audio_bytes: bytes = b"audio", speakers=None):
    """Common patches: TTS returns canned bytes + speakers, file IO
    is mocked out so tests don't touch the disk."""
    speakers = speakers or []

    def synth(*_args, **_kwargs):
        return audio_bytes, speakers

    return (
        patch(
            "services.listening_task_service.tts_service.synthesize_multispeaker",
            side_effect=synth,
        ),
        patch("services.listening_task_service.os.makedirs"),
        patch("services.listening_task_service.aiofiles.open"),
    )


# ---------- Adapter routing (Phase 2.1) ----------------------------


def test_adapter_routes_dictation() -> None:
    q = ListeningQuestionAdapter.validate_python(
        {
            "type": "dictation",
            "question": "Type what you heard.",
            "correctAnswer": "She left for Madrid on Tuesday morning.",
        }
    )
    assert isinstance(q, DictationQuestion)


def test_adapter_routes_true_false_not_given() -> None:
    q = ListeningQuestionAdapter.validate_python(
        {
            "type": "true_false_not_given",
            "question": "The speaker visited Berlin.",
            "correctAnswer": "not_given",
        }
    )
    assert isinstance(q, TrueFalseNotGivenQuestion)
    assert q.correctAnswer == "not_given"


def test_adapter_rejects_invalid_tfng_value() -> None:
    with pytest.raises(Exception):
        ListeningQuestionAdapter.validate_python(
            {
                "type": "true_false_not_given",
                "question": "?",
                "correctAnswer": "maybe",
            }
        )


def test_adapter_routes_sentence_completion_with_list() -> None:
    q = ListeningQuestionAdapter.validate_python(
        {
            "type": "sentence_completion",
            "question": "The speaker mentions ___ as the main reason.",
            "correctAnswer": ["climate change", "global warming"],
        }
    )
    assert isinstance(q, SentenceCompletionQuestion)
    assert q.correctAnswer == ["climate change", "global warming"]


def test_adapter_routes_multi_speaker_matching() -> None:
    q = ListeningQuestionAdapter.validate_python(
        {
            "type": "multi_speaker_matching",
            "question": "Who said what?",
            "speakers": ["Speaker 1", "Speaker 2"],
            "statements": [
                {"statement": "Wind is the future.", "correctSpeaker": "Speaker 1"},
                {"statement": "Solar wins on cost.", "correctSpeaker": "Speaker 2"},
            ],
        }
    )
    assert isinstance(q, MultiSpeakerMatchingQuestion)
    assert q.speakers == ["Speaker 1", "Speaker 2"]


def test_adapter_rejects_single_speaker_matching() -> None:
    """min_length=2 — a "matching" with one speaker is not a matching."""
    with pytest.raises(Exception):
        ListeningQuestionAdapter.validate_python(
            {
                "type": "multi_speaker_matching",
                "question": "?",
                "speakers": ["Alone"],
                "statements": [
                    {"statement": "x", "correctSpeaker": "Alone"},
                    {"statement": "y", "correctSpeaker": "Alone"},
                ],
            }
        )


# ---------- TTS speaker-tag splitter (Phase 2.3) -------------------


def test_split_by_speaker_tags_returns_empty_for_monologue() -> None:
    assert _split_by_speaker_tags("Just a normal sentence.") == []


def test_split_by_speaker_tags_two_speakers() -> None:
    text = (
        "[Speaker 1]: Hello there, how are you?\n"
        "[Speaker 2]: Hi! Doing fine, thanks.\n"
        "[Speaker 1]: Great to hear."
    )
    segs = _split_by_speaker_tags(text)
    assert [s for s, _ in segs] == ["Speaker 1", "Speaker 2", "Speaker 1"]
    assert segs[0][1].startswith("Hello there")
    assert segs[1][1].startswith("Hi!")


def test_split_by_speaker_tags_tolerates_whitespace() -> None:
    text = "  [ Anchor ]:  Welcome to the show.\n[ Guest ] :   Thanks for having me."
    segs = _split_by_speaker_tags(text)
    assert [s for s, _ in segs] == ["Anchor", "Guest"]


# ---------- Service flows ------------------------------------------


@pytest.mark.asyncio
async def test_create_listening_task_default_mix(
    listening_service: ListeningTaskService,
    mock_ai_service: MagicMock,
) -> None:
    """Default request (no question_types) keeps historic MC + FIB shape."""
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "transcript": "Once upon a time, a fox crossed the road.",
            "questions": [
                {
                    "type": "multiple_choice",
                    "question": "What crossed the road?",
                    "options": ["a fox", "a wolf", "a dog"],
                    "correctAnswer": "a fox",
                },
                {
                    "type": "fill_in_the_blank",
                    "question": "The animal crossed the ___.",
                    "correctAnswer": "road",
                },
            ],
        }
    )
    p1, p2, p3 = _patch_audio_pipeline()
    with p1, p2 as _mk, p3 as ao:
        ctx = MagicMock()
        ctx.__aenter__.return_value = AsyncMock()
        ctx.__aexit__.return_value = None
        ao.return_value = ctx

        request = ListeningTaskRequest(language="English", level="A2")
        result = await listening_service.create_listening_task(request)

    assert isinstance(result, ListeningTaskResponse)
    assert isinstance(result.questions[0], MultipleChoiceQuestion)
    assert isinstance(result.questions[1], FillInTheBlankQuestion)
    assert result.speakers == []  # monologue


@pytest.mark.asyncio
async def test_create_listening_task_dictation_mode(
    listening_service: ListeningTaskService,
    mock_ai_service: MagicMock,
) -> None:
    sentence = "She left for Madrid on Tuesday morning before sunrise."
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "transcript": sentence,
            "questions": [
                {
                    "type": "dictation",
                    "question": "Type what you heard.",
                    "correctAnswer": sentence,
                }
            ],
        }
    )
    p1, p2, p3 = _patch_audio_pipeline()
    with p1, p2, p3 as ao:
        ctx = MagicMock()
        ctx.__aenter__.return_value = AsyncMock()
        ctx.__aexit__.return_value = None
        ao.return_value = ctx

        request = ListeningTaskRequest(
            language="English", level="A1", question_types=["dictation"]
        )
        result = await listening_service.create_listening_task(request)

    assert isinstance(result.questions[0], DictationQuestion)
    assert result.questions[0].correctAnswer == sentence
    # Prompt must reference 10-18 word target for dictation, not the
    # 100-150 word default — this guards against regressions where the
    # branch logic gets reordered.
    sent_prompt = mock_ai_service.get_ai_response.await_args.args[0]
    assert "10-18 words" in sent_prompt


@pytest.mark.asyncio
async def test_create_listening_task_multi_speaker_synth(
    listening_service: ListeningTaskService,
    mock_ai_service: MagicMock,
) -> None:
    """When the transcript carries [Speaker N]: tags, the multi-speaker
    TTS path runs and the speakers list bubbles up to the response."""
    transcript = (
        "[Speaker 1]: Solar is the future of energy.\n"
        "[Speaker 2]: I disagree — wind is more reliable here.\n"
        "[Speaker 1]: But solar costs less per watt now."
    )
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "transcript": transcript,
            "questions": [
                {
                    "type": "multi_speaker_matching",
                    "question": "Who said what?",
                    "speakers": ["Speaker 1", "Speaker 2"],
                    "statements": [
                        {
                            "statement": "Solar is cheaper.",
                            "correctSpeaker": "Speaker 1",
                        },
                        {
                            "statement": "Wind is more reliable.",
                            "correctSpeaker": "Speaker 2",
                        },
                    ],
                }
            ],
        }
    )
    p1, p2, p3 = _patch_audio_pipeline(
        audio_bytes=b"multi-voice-mp3",
        speakers=["Speaker 1", "Speaker 2"],
    )
    with p1, p2, p3 as ao:
        ctx = MagicMock()
        ctx.__aenter__.return_value = AsyncMock()
        ctx.__aexit__.return_value = None
        ao.return_value = ctx

        request = ListeningTaskRequest(
            language="English",
            level="B2",
            question_types=["multi_speaker_matching"],
        )
        result = await listening_service.create_listening_task(request)

    assert isinstance(result.questions[0], MultiSpeakerMatchingQuestion)
    assert result.speakers == ["Speaker 1", "Speaker 2"]
    sent_prompt = mock_ai_service.get_ai_response.await_args.args[0]
    assert "[Speaker 1]:" in sent_prompt


@pytest.mark.asyncio
async def test_create_listening_task_drops_malformed_questions(
    listening_service: ListeningTaskService,
    mock_ai_service: MagicMock,
) -> None:
    """One valid + one invalid question = 1 parsed; service doesn't
    crash on a single bad item."""
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "transcript": "A short story.",
            "questions": [
                {
                    "type": "true_false_not_given",
                    "question": "The story is short.",
                    "correctAnswer": "true",
                },
                {
                    "type": "true_false_not_given",
                    "question": "?",
                    "correctAnswer": "maybe",  # invalid
                },
            ],
        }
    )
    p1, p2, p3 = _patch_audio_pipeline()
    with p1, p2, p3 as ao:
        ctx = MagicMock()
        ctx.__aenter__.return_value = AsyncMock()
        ctx.__aexit__.return_value = None
        ao.return_value = ctx

        request = ListeningTaskRequest(
            language="English",
            level="B1",
            question_types=["true_false_not_given"],
        )
        result = await listening_service.create_listening_task(request)

    assert len(result.questions) == 1
    assert isinstance(result.questions[0], TrueFalseNotGivenQuestion)


@pytest.mark.asyncio
async def test_create_listening_task_unknown_types_fall_back(
    listening_service: ListeningTaskService,
    mock_ai_service: MagicMock,
) -> None:
    """Unrecognised types in the request shouldn't break anything;
    we silently fall back to the default mix."""
    mock_ai_service.get_ai_response.return_value = json.dumps(
        {
            "transcript": "A short story.",
            "questions": [
                {
                    "type": "multiple_choice",
                    "question": "?",
                    "options": ["a", "b"],
                    "correctAnswer": "a",
                }
            ],
        }
    )
    p1, p2, p3 = _patch_audio_pipeline()
    with p1, p2, p3 as ao:
        ctx = MagicMock()
        ctx.__aenter__.return_value = AsyncMock()
        ctx.__aexit__.return_value = None
        ao.return_value = ctx

        request = ListeningTaskRequest(
            language="English",
            level="A1",
            question_types=["nonsense", "also_nonsense"],
        )
        result = await listening_service.create_listening_task(request)
    assert len(result.questions) == 1


@pytest.mark.asyncio
async def test_create_listening_task_ai_failure(
    listening_service: ListeningTaskService,
    mock_ai_service: MagicMock,
) -> None:
    mock_ai_service.get_ai_response.side_effect = Exception("AI Error")
    request = ListeningTaskRequest(language="English", level="A1")
    with pytest.raises(Exception):
        await listening_service.create_listening_task(request)


@pytest.mark.asyncio
async def test_create_listening_task_invalid_json(
    listening_service: ListeningTaskService,
    mock_ai_service: MagicMock,
) -> None:
    mock_ai_service.get_ai_response.return_value = "invalid json"
    request = ListeningTaskRequest(language="English", level="A1")
    with pytest.raises(ValueError, match="Failed to parse AI response"):
        await listening_service.create_listening_task(request)
