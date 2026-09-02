import pytest

from models.dtos.material_dtos import DocumentExercise
from services.material_service import MaterialService, attach_shared_passage

PASSAGE = "Charles Darwin sailed on the H.M.S. Beagle and studied finches."


@pytest.mark.parametrize(
    "exercise_type",
    [
        "reading_comprehension",
        "listening_comprehension",
        "cloze_passage",
        "sentence_reordering",
    ],
)
def test_passage_bearing_exercises_still_get_a_stimulus(exercise_type):
    exercise = DocumentExercise(type=exercise_type)
    assert MaterialService._needs_stimulus(exercise) is True


@pytest.mark.parametrize(
    "exercise_type",
    [
        "gap_fill_grammar",
        "gap_fill_vocab",
        "multiple_choice",
        "multi_select_mc",
        "true_false",
        "matching",
        "essay",
        "short_answer",
        "speaking_prompt",
    ],
)
def test_a_grammar_or_vocabulary_exercise_gets_no_passage(exercise_type):
    exercise = DocumentExercise(type=exercise_type, passage_word_count_estimate=400)
    assert MaterialService._needs_stimulus(exercise) is False


def test_a_word_count_alone_no_longer_forces_a_passage():
    exercise = DocumentExercise(type="gap_fill_grammar", passage_word_count_estimate=900)
    assert MaterialService._needs_stimulus(exercise) is False


def test_the_shared_passage_appears_under_the_first_question_only():
    items = attach_shared_passage([{}, {}, {}], PASSAGE)
    assert [item["context_text"] for item in items] == [PASSAGE, None, None]


def test_a_repeated_copy_of_the_shared_passage_is_dropped():
    items = attach_shared_passage(
        [{"context_text": PASSAGE}, {"context_text": PASSAGE}], PASSAGE
    )
    assert [item["context_text"] for item in items] == [PASSAGE, None]


def test_a_question_with_its_own_context_keeps_it():
    items = attach_shared_passage(
        [{}, {"context_text": "A different mini-context."}, {}], PASSAGE
    )
    assert items[0]["context_text"] == PASSAGE
    assert items[1]["context_text"] == "A different mini-context."
    assert items[2]["context_text"] is None


def test_without_a_stimulus_no_question_carries_a_passage():
    items = attach_shared_passage([{}, {"context_text": ""}, {"context_text": "   "}], None)
    assert [item["context_text"] for item in items] == [None, None, None]


def test_a_dropped_first_question_does_not_take_the_passage_with_it():
    survivors = [{"type": "multiple_choice"}, {"type": "true_false"}]

    attach_shared_passage(survivors, PASSAGE)

    assert survivors[0]["context_text"] == PASSAGE
    assert survivors[1]["context_text"] is None


@pytest.mark.asyncio
async def test_the_generator_drops_stemless_items_before_attaching_the_passage(
    monkeypatch,
):
    service = MaterialService.__new__(MaterialService)
    payload = {
        "questions": [
            {"type": "multiple_choice", "options": ["a", "b"], "correct_answer": "a"},
            {
                "type": "multiple_choice",
                "question": "What drives the change?",
                "options": ["Natural selection", "Genetic drift"],
                "correct_answer": "Natural selection",
            },
            {
                "type": "true_false",
                "question": "Darwin sailed on the Beagle.",
                "correct_answer": "true",
            },
        ]
    }

    class _Stub:
        async def get_ai_response(self, **_kwargs):
            import json

            return json.dumps(payload)

    service.ai_service = _Stub()
    questions = await service._generate_questions(
        exercise=DocumentExercise(type="reading_comprehension"),
        stimulus=PASSAGE,
        ui_lang="English",
        target_language=None,
        user_context=None,
    )

    assert [q.question for q in questions] == [
        "What drives the change?",
        "Darwin sailed on the Beagle.",
    ]
    assert questions[0].context_text == PASSAGE
    assert questions[1].context_text is None


@pytest.mark.asyncio
async def test_a_question_dropped_by_option_dedupe_does_not_take_the_passage(
    monkeypatch,
):
    service = MaterialService.__new__(MaterialService)
    payload = {
        "questions": [
            {
                "type": "multiple_choice",
                "question": "Which one is correct?",
                "options": ["Natural selection", " natural selection "],
                "correct_answer": "Natural selection",
            },
            {
                "type": "multiple_choice",
                "question": "What did Darwin study on the Galapagos?",
                "options": ["Finches", "Whales"],
                "correct_answer": "Finches",
            },
            {
                "type": "true_false",
                "question": "Darwin sailed on the Beagle.",
                "correct_answer": "true",
            },
        ]
    }

    class _Stub:
        async def get_ai_response(self, **_kwargs):
            import json

            return json.dumps(payload)

    service.ai_service = _Stub()
    questions = await service._generate_questions(
        exercise=DocumentExercise(type="reading_comprehension"),
        stimulus=PASSAGE,
        ui_lang="English",
        target_language=None,
        user_context=None,
    )

    assert [q.question for q in questions] == [
        "What did Darwin study on the Galapagos?",
        "Darwin sailed on the Beagle.",
    ]
    assert questions[0].context_text == PASSAGE
    assert questions[1].context_text is None
