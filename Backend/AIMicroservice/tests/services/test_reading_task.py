"""A reading lesson has to reach the learner as a passage plus questions.

FR7 names reading as one of the four skills, and until this the quiz route
offered every Materials type except the one that carries a passage: a learner
could meet cloze and matching but never a comprehension question over a text.
"""

import pytest

from models.dtos.material_dtos import DocumentExercise
from services.material_service import (
    MaterialService,
    _STIMULUS_BEARING_TYPES,
)


@pytest.fixture
def service():
    return MaterialService.__new__(MaterialService)


class TestReadingIsAStimulusType:
    def test_reading_comprehension_carries_a_passage(self):
        assert "reading_comprehension" in _STIMULUS_BEARING_TYPES


class TestStandaloneReadingTask:
    @pytest.mark.asyncio
    async def test_a_reading_task_asks_the_pipeline_for_a_passage(
        self, service, monkeypatch
    ):
        seen: list = []

        async def capture(exercise: DocumentExercise, **_kwargs):
            seen.append(exercise)
            return []

        monkeypatch.setattr(
            service, "_build_questions_for_exercise", capture, raising=False
        )

        await service.generate_standalone_task(
            task_type="reading_comprehension", language="English", level="B2"
        )

        assert seen, "the pipeline was never called"
        assert seen[0].type == "reading_comprehension"
        assert seen[0].passage_word_count_estimate == 200, (
            "a reading question without a passage is the Quizbot failure of Chapter 2"
        )

    @pytest.mark.asyncio
    async def test_a_grammar_task_still_asks_for_no_passage(
        self, service, monkeypatch
    ):
        seen: list = []

        async def capture(exercise: DocumentExercise, **_kwargs):
            seen.append(exercise)
            return []

        monkeypatch.setattr(
            service, "_build_questions_for_exercise", capture, raising=False
        )

        await service.generate_standalone_task(
            task_type="multiple_choice", language="English", level="B2"
        )

        assert seen[0].passage_word_count_estimate is None
