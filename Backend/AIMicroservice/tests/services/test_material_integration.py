"""Integration test: synthetic TOEFL-style PDF flows through the real
pypdf parser and the (mocked) AI pipeline end-to-end. The point is to
exercise the wiring — DocumentMap round-trip, multi-stage quiz
generation, multi-variant question parsing — on a realistic input,
not to validate AI behaviour itself."""

import json
import pytest
from unittest.mock import MagicMock, AsyncMock

from services.material_service import MaterialService
from models.dtos.material_dtos import (
    GenerateQuizResponse,
    QuizContent,
    DocumentMap,
    MultipleChoiceQuizQuestion,
    TrueFalseQuizQuestion,
    MultiSelectMCQuizQuestion,
    MatchingQuizQuestion,
    ClozePassageQuizQuestion,
    FillInTheBlankQuizQuestion,
)
from models.dtos.vector_db_dtos import MaterialChunk
from tests.fixtures.synthetic_pdf import write_toefl_reading_pdf


@pytest.fixture
def mock_vector_db() -> MagicMock:
    db = MagicMock()
    db.search_materials.return_value = [
        MaterialChunk(
            text="Bird migration involves long seasonal journeys.",
            source="toefl.pdf",
            chunk_index=0,
            vector=[0.1],
        )
    ]
    return db


@pytest.fixture
def mock_ai_service() -> MagicMock:
    svc = MagicMock()
    svc.get_ai_response = AsyncMock()
    return svc


@pytest.fixture
def material_service(mock_vector_db, mock_ai_service) -> MaterialService:
    return MaterialService(mock_vector_db, mock_ai_service)


@pytest.mark.asyncio
async def test_full_pipeline_on_synthetic_toefl_pdf(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """End-to-end trace:

    1. process_pdf runs the real pypdf parser on a multi-page TOEFL-
       shaped PDF, extracts text, and feeds the (mocked) classifier.
    2. The classifier returns a TOEFL_Reading DocumentMap with one
       reading_comprehension exercise sized to ~720 words.
    3. generate_quiz is then called with that map. Stage 2 generates
       a fresh passage; Stage 3 returns five different question
       variants. The parser must route every one to the right
       discriminated-union subclass.
    """
    # --- Stage 1: classification on the real PDF ---
    pdf_bytes = write_toefl_reading_pdf()
    classification_response = json.dumps(
        {
            "document_kind": "TOEFL_Reading",
            "exercises": [
                {
                    "type": "reading_comprehension",
                    "passage_word_count_estimate": 720,
                    "passage_topic_hint": "bird migration",
                    "passage_excerpt_for_style": (
                        "Migration is one of the most striking phenomena in the animal kingdom"
                    ),
                    "question_count": 7,
                    "question_subtypes": [
                        "main_idea",
                        "vocab_in_context",
                        "negative_fact",
                        "purpose",
                    ],
                    "grammar_focus": [],
                    "example": "What does hyperphagia most nearly mean?",
                }
            ],
        }
    )
    mock_ai_service.get_ai_response.side_effect = [classification_response]
    process_result = await material_service.process_pdf(pdf_bytes, "toefl.pdf")

    assert process_result.document_map is not None
    assert process_result.document_map.document_kind == "TOEFL_Reading"
    assert len(process_result.document_map.exercises) == 1
    ex = process_result.document_map.exercises[0]
    assert ex.passage_word_count_estimate == 720
    assert ex.type == "reading_comprehension"
    # The real pypdf parser actually ran on the synthetic PDF — this
    # is what guards against regressions like a future change to the
    # garbled-text heuristic accidentally rejecting valid documents.
    assert process_result.chunks_count > 0
    # The classifier must see the actual passage text — verify by
    # checking the prompt argument that was sent. The first AI call's
    # `prompt` kwarg should contain a snippet from the passage.
    first_call_kwargs = mock_ai_service.get_ai_response.await_args_list[0].kwargs
    assert "Migration" in first_call_kwargs["prompt"]

    # --- Stage 2 + Stage 3: drive generate_quiz with the same map ---
    stage_2_passage = (
        "Birds use multiple cues to navigate during their long journeys, "
        "from the angle of polarised sunlight on overcast mornings to "
        "the slow rotation of stars overhead at night. Recent research "
        "also points to the role of magnetic-field detection through "
        "specialised cells in the eye, suggesting an internal compass "
        "that operates regardless of weather conditions."
    )
    stage_3_questions = json.dumps(
        {
            "questions": [
                {
                    "type": "multiple_choice",
                    "question": "Which cue is described as a 'celestial compass'?",
                    "options": [
                        "polarised light",
                        "star rotation",
                        "magnetic field",
                        "wind direction",
                    ],
                    "correct_answer": "star rotation",
                    "context_text": stage_2_passage,
                },
                {
                    "type": "true_false",
                    "question": "Birds rely solely on landmarks during overcast skies.",
                    "correct_answer": "false",
                    "context_text": stage_2_passage,
                },
                {
                    "type": "multi_select_mc",
                    "question": "Select all cues mentioned for navigation.",
                    "options": [
                        "polarised light",
                        "star rotation",
                        "earth's magnetic field",
                        "echolocation",
                    ],
                    "correct_answers": [
                        "polarised light",
                        "star rotation",
                        "earth's magnetic field",
                    ],
                    "context_text": stage_2_passage,
                },
                {
                    "type": "matching",
                    "question": "Match each navigational cue to its description.",
                    "pairs": [
                        {"left": "polarised light", "right": "still works under clouds"},
                        {"left": "star rotation", "right": "fixed centre at night"},
                        {"left": "magnetic field", "right": "eye-based compass"},
                    ],
                    "context_text": stage_2_passage,
                },
                {
                    "type": "fill_in_the_blank",
                    "question": "Birds detect the earth's magnetic ___ through cells in the eye.",
                    "options": [],
                    "correct_answer": ["field"],
                    "context_text": stage_2_passage,
                },
            ]
        }
    )
    mock_ai_service.get_ai_response.side_effect = [
        json.dumps({"passage": stage_2_passage}),
        stage_3_questions,
    ]

    quiz_result = await material_service.generate_quiz(
        document_map=process_result.document_map
    )

    assert isinstance(quiz_result, GenerateQuizResponse)
    assert isinstance(quiz_result.quiz, QuizContent)
    qs = quiz_result.quiz.questions
    assert len(qs) == 5
    assert isinstance(qs[0], MultipleChoiceQuizQuestion)
    assert isinstance(qs[1], TrueFalseQuizQuestion)
    assert isinstance(qs[2], MultiSelectMCQuizQuestion)
    assert isinstance(qs[3], MatchingQuizQuestion)
    assert isinstance(qs[4], FillInTheBlankQuizQuestion)
    # Every passage-bound question carries the same Stage 2 stimulus.
    for q in qs:
        assert q.context_text == stage_2_passage


@pytest.mark.asyncio
async def test_pipeline_rejects_garbled_pdf_text(
    material_service: MaterialService,
    mock_ai_service: MagicMock,
) -> None:
    """Heuristic guard at process_pdf level: if pypdf coughs up
    high-bit nonsense (custom-font / encrypted PDFs), we should
    refuse rather than feed the AI invalid input."""
    # Hand-rolled bytes: dense enough in non-text control characters
    # to cross the 30% threshold the garbled-text heuristic uses
    # (\w / whitespace / basic punctuation are the "good" set, so we
    # use raw control bytes that match none of those).
    garbage = "\x03\x05\x07\x0b\x0c\x0e\x10\x12" * 50
    fake_pdf_bytes = write_toefl_reading_pdf()  # real PDF, but we'll
    # patch the pypdf reader to return garbage text.
    from unittest.mock import patch

    with patch("services.material_service.PdfReader") as MockReader:
        mock_pdf = MockReader.return_value
        page = MagicMock()
        page.extract_text.return_value = garbage
        mock_pdf.pages = [page]

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await material_service.process_pdf(fake_pdf_bytes, "garbled.pdf")
        # 400 with the dedicated PDF_GARBLED_TEXT code.
        assert exc_info.value.status_code == 400
