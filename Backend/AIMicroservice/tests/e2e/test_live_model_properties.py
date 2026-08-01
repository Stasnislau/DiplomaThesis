"""Live-model tests that check the answer, not only that an answer arrived.

The suite next door calls a real provider and accepts any reply the application
can parse, so it proves the path is open and nothing more. These cases check
properties that must hold whatever words the model picks: an exercise whose
correct answer is missing from its own options is unanswerable however fluent it
reads, and a generator that returns the same sentence twice is not a generator.

They run outside the default job because they are slow and spend tokens:

    pytest tests/e2e/test_live_model_properties.py -v -s

Nothing here skips. Retries on a loaded provider live in `post_live`.
"""

from __future__ import annotations

import asyncio
import json
import re

import pytest
from fastapi.testclient import TestClient

from tests.e2e.conftest import post_live

pytestmark = [pytest.mark.e2e]

# A gap can be underscores, a run of dots, or an ellipsis. Accept any of them,
# because the shape of the gap is the model's choice and not a property.
_BLANK = re.compile(r"_{2,}|\.{3,}|…")


def _multiple_choice(client: TestClient, language: str, level: str) -> dict:
    return post_live(
        client,
        "/api/writing/multiplechoice",
        {"language": language, "level": level},
    )


class TestMultipleChoiceIsAnswerable:
    """A learner must be able to answer the exercise the model just wrote."""

    def test_the_correct_answer_is_one_of_the_options(self, client: TestClient) -> None:
        task = _multiple_choice(client, "English", "B1")
        options = task["options"]
        answer = task["correctAnswer"]
        answers = answer if isinstance(answer, list) else [answer]

        assert len(options) >= 2, f"too few options: {options}"
        for one in answers:
            assert one in options, f"answer {one!r} missing from {options}"

    def test_the_options_are_distinct(self, client: TestClient) -> None:
        task = _multiple_choice(client, "English", "A2")
        options = [o.strip().lower() for o in task["options"]]

        assert len(set(options)) == len(options), f"repeated option: {options}"

    def test_the_question_leaves_a_gap_to_fill(self, client: TestClient) -> None:
        task = _multiple_choice(client, "English", "B1")

        assert _BLANK.search(task["question"]), f"no gap in: {task['question']!r}"


class TestGenerationVaries:
    """Two learners asking for the same thing must not get the same sentence."""

    def test_two_calls_return_different_questions(self, client: TestClient) -> None:
        first = _multiple_choice(client, "English", "B1")
        second = _multiple_choice(client, "English", "B1")

        assert first["question"].strip() != second["question"].strip(), (
            f"generator repeated itself: {first['question']!r}"
        )


class TestGeneratedPolishIsGrammatical:
    """The defect this catches is real: a placement test served
    `Moja ulubiona wspomnienia` and `Mój ulubiona pora roku`, both wrong in
    gender or number. No structural check sees it, so a second model reads the
    sentence and answers one question about it. Four tasks are graded and three
    must pass, because a single verdict from a nondeterministic judge decides
    nothing.
    """

    _SAMPLE = 4
    _REQUIRED = 3

    def _judge(self, sentence: str) -> bool:
        from services.ai_service import AI_Service

        prompt = (
            "You are a Polish language examiner. Read the sentence below and "
            "decide whether it is grammatically correct Polish, ignoring the "
            "blank and ignoring punctuation. Answer with JSON only, no prose, "
            'in the form {"correct": true} or {"correct": false}.\n\n'
            f"Sentence: {sentence}"
        )
        raw = asyncio.run(
            AI_Service().get_ai_response(prompt, ai_provider_id="groq")
        )
        match = re.search(r'\{[^{}]*"correct"[^{}]*\}', raw)
        assert match, f"judge returned no verdict: {raw[:200]!r}"
        return bool(json.loads(match.group(0))["correct"])

    def test_most_generated_questions_are_grammatical(self, client: TestClient) -> None:
        verdicts = []
        for _ in range(self._SAMPLE):
            task = _multiple_choice(client, "Polish", "B1")
            verdicts.append((task["question"], self._judge(task["question"])))

        good = [q for q, ok in verdicts if ok]
        bad = [q for q, ok in verdicts if not ok]

        assert len(good) >= self._REQUIRED, (
            f"{len(bad)} of {self._SAMPLE} questions were judged ungrammatical: {bad}"
        )
