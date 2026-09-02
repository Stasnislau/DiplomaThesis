
from __future__ import annotations

import importlib

import pytest


def test_main_app_imports_and_constructs() -> None:
    main = importlib.import_module("main")
    assert main.app is not None
    assert len(main.app.routes) > 5


@pytest.mark.parametrize(
    "expected_path",
    [
        "/api/materials/upload",
        "/api/materials/quiz",
        "/api/materials/result",
        "/api/tasks/listening",
        "/api/tasks/listening/adaptive",
        "/api/tasks/listening/result",
        "/api/speaking/analyze",
        "/api/speaking/practice-phrase",
        "/api/speaking/practice-prompt",
        "/api/speaking/grade-response",
        "/health",
    ],
)
def test_route_is_registered(expected_path: str) -> None:
    main = importlib.import_module("main")
    paths = {getattr(r, "path", None) for r in main.app.routes}
    assert expected_path in paths, (
        f"{expected_path} not registered. Found {sorted(p for p in paths if p)}"
    )


@pytest.mark.parametrize(
    "module_name",
    [
        "controllers.material_controller",
        "controllers.listening_controller",
        "controllers.speaking_controller",
        "controllers.placement_controller",
        "controllers.learning_path_controller",
    ],
)
def test_controller_imports(module_name: str) -> None:
    module = importlib.import_module(module_name)
    assert module is not None


@pytest.mark.parametrize(
    "module_name, attr",
    [
        ("services.material_service", "MaterialService"),
        ("services.listening_task_service", "ListeningTaskService"),
        ("services.speaking_service", "SpeakingService"),
        ("services.tts_service", "TTSService"),
        ("services.ai_service", "AI_Service"),
        ("services.user_service", "UserService"),
    ],
)
def test_service_class_is_importable(module_name: str, attr: str) -> None:
    module = importlib.import_module(module_name)
    cls = getattr(module, attr, None)
    assert cls is not None, f"{attr} not exported from {module_name}"


def test_quiz_question_union_routes_every_known_type() -> None:
    from models.dtos.material_dtos import QuizQuestionAdapter

    samples = [
        {"type": "multiple_choice", "question": "?", "options": ["a"], "correct_answer": "a"},
        {"type": "open", "question": "?", "options": [], "correct_answer": "x"},
        {
            "type": "fill_in_the_blank",
            "question": "She ___ home.",
            "options": [],
            "correct_answer": "went",
        },
        {"type": "true_false", "question": "?", "correct_answer": "true"},
        {
            "type": "matching",
            "question": "?",
            "pairs": [{"left": "a", "right": "b"}, {"left": "c", "right": "d"}],
        },
        {
            "type": "multi_select_mc",
            "question": "?",
            "options": ["A", "B", "C"],
            "correct_answers": ["A", "B"],
        },
        {
            "type": "cloze_passage",
            "question": "?",
            "passage_with_blanks": "x {{1}} y",
            "blanks": [{"id": "1", "correct_answer": "z"}],
        },
    ]
    for s in samples:
        QuizQuestionAdapter.validate_python(s)


def test_listening_question_union_routes_every_known_type() -> None:
    from models.responses.listening_task_response import ListeningQuestionAdapter

    samples = [
        {"type": "multiple_choice", "question": "?", "options": ["a"], "correctAnswer": "a"},
        {"type": "fill_in_the_blank", "question": "?", "correctAnswer": "x"},
        {"type": "dictation", "question": "?", "correctAnswer": "x"},
        {"type": "true_false_not_given", "question": "?", "correctAnswer": "not_given"},
        {"type": "sentence_completion", "question": "?", "correctAnswer": "x"},
        {
            "type": "multi_speaker_matching",
            "question": "?",
            "speakers": ["S1", "S2"],
            "statements": [
                {"statement": "a", "correctSpeaker": "S1"},
                {"statement": "b", "correctSpeaker": "S2"},
            ],
        },
    ]
    for s in samples:
        ListeningQuestionAdapter.validate_python(s)


def test_speaking_format_catalog_is_consistent() -> None:
    from models.responses.speaking_format_response import (
        FORMAT_DEFAULT_DURATION,
        FORMAT_RUBRIC_HINTS,
        is_known_format,
    )

    formats = set(FORMAT_DEFAULT_DURATION.keys())
    assert formats == set(FORMAT_RUBRIC_HINTS.keys())
    for f in formats:
        assert is_known_format(f)
    assert not is_known_format("not_a_real_format")


def test_health_endpoint_returns_200() -> None:
    from fastapi.testclient import TestClient
    main = importlib.import_module("main")
    client = TestClient(main.app)
    response = client.get("/health")
    assert response.status_code == 200
    response2 = client.get("/api/health")
    assert response2.status_code == 200
