import pytest

from models.dtos.material_dtos import DocumentExercise
from services.material_service import _document_map_from


@pytest.mark.parametrize("key", ["type", "exercise_type", "task_type", "kind"])
def test_the_exercise_type_is_read_from_whichever_key_the_model_used(key):
    exercise = DocumentExercise.model_validate({key: "gap_fill_vocab"})
    assert exercise.type == "gap_fill_vocab"


@pytest.mark.parametrize("empty", ["", "  ", "null", "NONE", "n/a", "-", None])
def test_a_null_like_type_falls_through_to_inference(empty):
    exercise = DocumentExercise.model_validate(
        {"type": empty, "passage_word_count_estimate": 720}
    )
    assert exercise.type == "reading_comprehension"


def test_a_missing_type_with_a_passage_length_becomes_a_reading_exercise():
    exercise = DocumentExercise.model_validate({"passage_word_count_estimate": 400})
    assert exercise.type == "reading_comprehension"


def test_a_missing_type_with_nothing_to_infer_from_stays_blank():
    exercise = DocumentExercise.model_validate({"example": "Choose the best word."})
    assert exercise.type == ""


def test_a_declared_type_always_wins_over_inference():
    exercise = DocumentExercise.model_validate(
        {"type": "gap_fill_grammar", "passage_word_count_estimate": 900}
    )
    assert exercise.type == "gap_fill_grammar"


def test_one_broken_exercise_no_longer_discards_the_whole_map():
    document_map = _document_map_from(
        {
            "document_kind": "TOEFL_Reading",
            "exercises": [
                {"type": "reading_comprehension", "question_count": 4},
                "this is not an object",
                {"type": "gap_fill_vocab"},
            ],
        }
    )
    assert [item.type for item in document_map.exercises] == [
        "reading_comprehension",
        "gap_fill_vocab",
    ]
    assert document_map.document_kind == "TOEFL_Reading"


def test_a_map_without_a_document_kind_defaults_to_mixed():
    document_map = _document_map_from({"exercises": [{"type": "essay"}]})
    assert document_map.document_kind == "Mixed"


def test_an_empty_exercise_list_yields_an_empty_map():
    document_map = _document_map_from({"document_kind": "Reading", "exercises": []})
    assert document_map.exercises == []


def test_the_real_production_payload_that_used_to_fail():
    document_map = _document_map_from(
        {
            "document_kind": "TOEFL_Reading",
            "exercises": [
                {
                    "passage_word_count_estimate": 720,
                    "example": "What is the main idea of paragraph 3 in the passage?",
                    "grammar_focus": "null",
                },
                {
                    "passage_word_count_estimate": 720,
                    "example": "The word 'traits' is closest in meaning to:",
                    "grammar_focus": "null",
                },
            ],
        }
    )
    assert len(document_map.exercises) == 2
    assert all(item.type == "reading_comprehension" for item in document_map.exercises)
    assert all(item.grammar_focus == [] for item in document_map.exercises)
