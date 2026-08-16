from models.dtos.task_dto import MultipleChoiceTask
from utils.task_quality import (
    coerce_mc_answer,
    fill_in_the_blank_quality_issues,
    multiple_choice_quality_issues,
    sanitize_multiple_choice,
)


def test_coerce_prefers_an_option_that_is_literally_a() -> None:
    assert coerce_mc_answer("A", ["A", "B"]) == "A"


def test_coerce_maps_a_letter_onto_the_named_option() -> None:
    assert coerce_mc_answer("C", ["went", "go", "gone", "going"]) == "gone"
    assert coerce_mc_answer("b.", ["went", "go", "gone"]) == "go"
    assert coerce_mc_answer("Option D", ["w", "x", "y", "z"]) == "z"


def test_coerce_maps_a_zero_based_index() -> None:
    assert coerce_mc_answer(1, ["went", "go", "gone"]) == "go"


def test_multiple_choice_task_coerces_letter_answers() -> None:
    task = MultipleChoiceTask(
        id="1",
        type="multiple_choice",
        question="She ____ home.",
        options=["went", "go", "goes", "going"],
        correct_answer="C",
    )
    assert task.correct_answer == "goes"


def test_mc_quality_rejects_a_question_with_no_gap() -> None:
    issues = multiple_choice_quality_issues(
        {
            "question": "What is the past of go?",
            "options": ["went", "go"],
            "correctAnswer": "went",
        }
    )
    assert "no gap in question" in issues


def test_mc_quality_accepts_a_well_formed_item() -> None:
    issues = multiple_choice_quality_issues(
        {
            "question": "She ____ home yesterday.",
            "options": ["went", "go", "goes", "going"],
            "correctAnswer": "went",
        }
    )
    assert issues == []


def test_sanitize_rewrites_a_letter_answer_before_quality() -> None:
    payload = sanitize_multiple_choice(
        {
            "question": "She ____ home yesterday.",
            "options": ["went", "go", "goes", "going"],
            "correctAnswer": "A",
        }
    )
    assert payload["correctAnswer"] == "went"
    assert multiple_choice_quality_issues(payload) == []


def test_fib_quality_ignores_the_ui_language_gloss() -> None:
    issues = fill_in_the_blank_quality_issues(
        {
            "question": "I ____ to the park every day. (go)",
            "correctAnswer": ["go"],
        }
    )
    assert issues == []


def test_fib_quality_rejects_an_answer_that_already_sits_in_the_stem() -> None:
    issues = fill_in_the_blank_quality_issues(
        {
            "question": "I like to ____ at the market to buy vegetables. (buy)",
            "correctAnswer": ["buy"],
        }
    )
    assert any("already appears" in item for item in issues)
