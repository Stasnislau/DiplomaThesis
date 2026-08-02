import pytest

from models.dtos.material_dtos import QuizQuestionAdapter
from services.material_service import _question_stem


def _mc(**overrides):
    payload = {
        "type": "multiple_choice",
        "options": ["Natural selection", "Genetic drift"],
        "correct_answer": "Natural selection",
    }
    payload.update(overrides)
    return payload


@pytest.mark.parametrize(
    "key",
    ["question", "question_text", "prompt", "stem", "instruction", "text", "title"],
)
def test_the_stem_is_read_from_whichever_key_the_model_used(key):
    question = QuizQuestionAdapter.validate_python(_mc(**{key: "Why did finches differ?"}))
    assert question.question == "Why did finches differ?"


@pytest.mark.parametrize("empty", ["", "   ", "null", "NULL", "none", "n/a", "-", None])
def test_a_null_like_stem_falls_through_to_the_next_key(empty):
    question = QuizQuestionAdapter.validate_python(
        _mc(question=empty, prompt="Recovered from prompt")
    )
    assert question.question == "Recovered from prompt"


def test_the_first_usable_key_wins():
    question = QuizQuestionAdapter.validate_python(
        _mc(question="Real stem", prompt="Should be ignored")
    )
    assert question.question == "Real stem"


def test_a_stem_split_across_a_list_is_joined():
    question = QuizQuestionAdapter.validate_python(
        _mc(question=["According to paragraph 2,", "what caused the change?"])
    )
    assert question.question == "According to paragraph 2, what caused the change?"


def test_surrounding_whitespace_is_stripped():
    question = QuizQuestionAdapter.validate_python(_mc(question="  Spaced out  "))
    assert question.question == "Spaced out"


def test_nothing_usable_leaves_the_stem_empty():
    question = QuizQuestionAdapter.validate_python(_mc())
    assert question.question == ""


@pytest.mark.parametrize(
    "raw, expected",
    [
        ({"question": "Direct"}, "Direct"),
        ({"question": "null", "stem": "Fallback"}, "Fallback"),
        ({"prompt": ["a", "b"]}, "a b"),
        ({}, ""),
        ({"question": None, "text": "   "}, ""),
    ],
)
def test_question_stem_helper_matches_the_model_behaviour(raw, expected):
    assert _question_stem(raw) == expected
