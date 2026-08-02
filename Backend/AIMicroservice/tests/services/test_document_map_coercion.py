import pytest

from models.dtos.material_dtos import DocumentExercise, DocumentMap


def _exercise(**overrides):
    payload = {"type": "reading_comprehension"}
    payload.update(overrides)
    return payload


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("null", []),
        ("NULL", []),
        ("none", []),
        ("n/a", []),
        ("-", []),
        ("", []),
        ("   ", []),
        (None, []),
        ("past simple", ["past simple"]),
        (["past simple", " articles "], ["past simple", "articles"]),
        (["past simple", "", "  "], ["past simple"]),
        (("a", "b"), ["a", "b"]),
        (42, []),
        ({"focus": "x"}, []),
    ],
)
def test_grammar_focus_survives_whatever_the_model_returns(raw, expected):
    exercise = DocumentExercise(**_exercise(grammar_focus=raw))
    assert exercise.grammar_focus == expected


def test_question_subtypes_uses_the_same_coercion():
    exercise = DocumentExercise(**_exercise(question_subtypes="null"))
    assert exercise.question_subtypes == []


def test_document_map_parses_when_a_model_sends_the_string_null():
    payload = {
        "document_kind": "Reading",
        "exercises": [
            _exercise(grammar_focus="null", question_count=4),
            _exercise(grammar_focus="null", question_count=3),
        ],
    }

    document_map = DocumentMap(**payload)

    assert len(document_map.exercises) == 2
    assert all(item.grammar_focus == [] for item in document_map.exercises)


def test_a_real_list_is_left_alone():
    exercise = DocumentExercise(
        **_exercise(grammar_focus=["present perfect", "passive voice"])
    )
    assert exercise.grammar_focus == ["present perfect", "passive voice"]
