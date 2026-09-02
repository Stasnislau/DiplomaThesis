
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.e2e.conftest import post_live

pytestmark = [pytest.mark.e2e]


class TestWritingFlows:
    def test_fill_in_blank(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/writing/blank",
            {"language": "English", "level": "B1", "topic": "travel"},
        )
        assert p["type"] == "fill_in_the_blank"

    def test_multiple_choice(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/writing/multiplechoice",
            {"language": "English", "level": "A2"},
        )
        assert p["type"] == "multiple_choice"
        assert len(p.get("options", [])) >= 2

    def test_adaptive_fill_in_blank(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/writing/adaptive",
            {"language": "English", "level": "B1", "flavour": "fill_in_the_blank"},
        )
        assert p["task"]["type"] == "fill_in_the_blank"

    def test_adaptive_multiple_choice(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/writing/adaptive",
            {"language": "English", "level": "A2", "flavour": "multiple_choice"},
        )
        assert p["task"]["type"] == "multiple_choice"

    def test_essay_generate(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/writing/essay/generate",
            {"language": "English", "level": "B2", "topic": "climate change"},
        )
        assert p.get("topic") or p.get("prompt"), f"no essay topic: {p}"

    def test_essay_evaluate(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/writing/essay/evaluate",
            {
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
        )
        assert isinstance(p.get("score"), (int, float)), f"no score: {p}"
        assert 0 <= p["score"] <= 100

    def test_explain_answer(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/writing/explainanswer",
            {
                "language": "English",
                "level": "B1",
                "task": "She ___ to the store yesterday.",
                "correctAnswer": "went",
                "userAnswer": "goed",
            },
        )
        assert p.get("explanation"), f"no explanation: {p}"


class TestSpeakingFlows:
    def test_practice_phrase(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/speaking/practice-phrase",
            {"language": "English", "level": "B1"},
        )
        assert p["phrase"]

    def test_read_aloud(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/speaking/practice-prompt",
            {"language": "English", "level": "A2", "format": "read_aloud"},
        )
        assert p["format"] == "read_aloud"
        assert p["prompt"]
        assert p["durationSeconds"] > 0

    def test_timed_response(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/speaking/practice-prompt",
            {"language": "English", "level": "B1", "format": "timed_response"},
        )
        assert p["format"] == "timed_response"
        assert p["prompt"]

    def test_picture_description_with_imagen(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/speaking/practice-prompt",
            {"language": "English", "level": "B1", "format": "picture_description"},
        )
        assert p["format"] == "picture_description"
        assert p["prompt"]
        assert p.get("imageUrl"), f"imageUrl missing: {p}"

    def test_free_monologue(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/speaking/practice-prompt",
            {"language": "Spanish", "level": "A2", "format": "free_monologue"},
        )
        assert p["format"] == "free_monologue"
        assert p["prompt"]

    def test_repeat_after_me(self, client: TestClient) -> None:
        with patch(
            "services.tts_service.TTSService.synthesize",
            new=MagicMock(return_value=b"fake-mp3"),
        ):
            p = post_live(
                client,
                "/api/speaking/practice-prompt",
                {"language": "English", "level": "A2", "format": "repeat_after_me"},
            )
        assert p["format"] == "repeat_after_me"
        assert p["targetPhrase"]


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
        p = post_live(
            client,
            "/api/tasks/listening",
            {"language": "English", "level": "A2"},
        )
        assert p["type"] == "listening"
        assert len(p["questions"]) >= 1
        assert p["audioUrl"]

    def test_dictation(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/tasks/listening",
            {
                "language": "English",
                "level": "B1",
                "question_types": ["dictation"],
            },
        )
        assert len(p["questions"]) >= 1

    def test_adaptive_listening(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/tasks/listening/adaptive",
            {"language": "English", "level": "A2"},
        )
        task = p.get("task", p)
        assert task.get("type") == "listening" or task.get("questions"), (
            f"unexpected adaptive listening payload: {p}"
        )


class TestPlacementFlows:
    def test_generate_question(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/placement/task",
            {"language": "English"},
        )
        assert p.get("question") or p.get("sentence") or p.get("text"), (
            f"no question content: {p}"
        )

    def test_evaluate(self, client: TestClient) -> None:
        p = post_live(
            client,
            "/api/placement/evaluate",
            {
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
        )
        assert p.get("level"), f"no level in evaluation: {p}"
