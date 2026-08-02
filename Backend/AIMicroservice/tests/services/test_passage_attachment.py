import pytest

from models.dtos.material_dtos import DocumentExercise
from services.material_service import MaterialService

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


def _attach(raw_questions, stimulus):
    """Mirror of the attachment rules applied in _generate_questions."""
    shared = (stimulus or "").strip()
    shown = False
    for raw in raw_questions:
        own = str(raw.get("context_text") or "").strip()
        if not shared:
            raw["context_text"] = own or None
            continue
        if not own:
            own = shared
            raw["context_text"] = shared
        if own == shared:
            if shown:
                raw["context_text"] = None
            else:
                shown = True
    return raw_questions


def test_the_shared_passage_appears_under_the_first_question_only():
    items = _attach([{}, {}, {}], PASSAGE)
    assert [item["context_text"] for item in items] == [PASSAGE, None, None]


def test_a_repeated_copy_of_the_shared_passage_is_dropped():
    items = _attach(
        [{"context_text": PASSAGE}, {"context_text": PASSAGE}], PASSAGE
    )
    assert [item["context_text"] for item in items] == [PASSAGE, None]


def test_a_question_with_its_own_context_keeps_it():
    items = _attach(
        [{}, {"context_text": "A different mini-context."}, {}], PASSAGE
    )
    assert items[0]["context_text"] == PASSAGE
    assert items[1]["context_text"] == "A different mini-context."
    assert items[2]["context_text"] is None


def test_without_a_stimulus_no_question_carries_a_passage():
    items = _attach([{}, {"context_text": ""}, {"context_text": "   "}], None)
    assert [item["context_text"] for item in items] == [None, None, None]
