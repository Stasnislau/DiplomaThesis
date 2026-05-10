import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from services.material_service import (
    MaterialService,
    _has_verbatim_overlap,
    _word_ngrams,
    _dedupe_preserve_order,
)
from models.dtos.material_dtos import (
    ProcessPdfResponse,
    GenerateQuizResponse,
    ChunkMetadata,
    QuizContent,
    QuizQuestionAdapter,
    DocumentMap,
    DocumentExercise,
    MultipleChoiceQuizQuestion,
    OpenQuizQuestion,
    FillInTheBlankQuizQuestion,
    TrueFalseQuizQuestion,
    MatchingQuizQuestion,
    MultiSelectMCQuizQuestion,
    ClozePassageQuizQuestion,
)
from models.dtos.vector_db_dtos import MaterialChunk


@pytest.fixture
def mock_vector_db() -> MagicMock:
    return MagicMock()


@pytest.fixture
def mock_ai_service() -> MagicMock:
    service = MagicMock()
    service.get_ai_response = AsyncMock()
    return service


@pytest.fixture
def material_service(mock_vector_db: MagicMock, mock_ai_service: MagicMock) -> MaterialService:
    return MaterialService(mock_vector_db, mock_ai_service)


@pytest.mark.asyncio
async def test_process_pdf_legacy_types_shape(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """Old `{types: [...]}` shape from a model that didn't follow the
    new schema must still be accepted via the legacy fallback branch."""
    with patch("services.material_service.PdfReader") as MockPdfReader:
        mock_pdf = MockPdfReader.return_value
        page = MagicMock()
        page.extract_text.return_value = "Chunk of text."
        mock_pdf.pages = [page]

        mock_ai_service.get_ai_response.return_value = (
            '{"types": [{"type": "multiple_choice", "example": "ex"}]}'
        )

        content = b"%PDF-1.4..."
        result = await material_service.process_pdf(content, "test.pdf")

        assert isinstance(result, ProcessPdfResponse)
        assert result.filename == "test.pdf"
        assert result.status == "success"
        assert result.document_map is None  # legacy shape -> no map

        mock_vector_db.save_chunks.assert_called_once()
        args, _ = mock_vector_db.save_chunks.call_args
        assert len(args[0]) >= 1
        assert isinstance(args[1][0], ChunkMetadata)


@pytest.mark.asyncio
async def test_process_pdf_document_map_shape(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """The new prompt asks for `{document_kind, exercises}`. When the
    model complies, we should populate ProcessPdfResponse.document_map
    AND derive analyzed_types for FE backward-compat."""
    with patch("services.material_service.PdfReader") as MockPdfReader:
        mock_pdf = MockPdfReader.return_value
        page = MagicMock()
        page.extract_text.return_value = "Reading passage about migration."
        mock_pdf.pages = [page]

        mock_ai_service.get_ai_response.return_value = (
            '{"document_kind": "TOEFL_Reading", "exercises": ['
            '{"type": "reading_comprehension",'
            ' "passage_word_count_estimate": 720,'
            ' "passage_topic_hint": "bird migration",'
            ' "passage_excerpt_for_style": "Migration is a complex behavior...",'
            ' "question_count": 10,'
            ' "question_subtypes": ["main_idea", "inference"],'
            ' "grammar_focus": [],'
            ' "example": "What is the main idea?"}]}'
        )

        result = await material_service.process_pdf(b"%PDF-1.4...", "toefl.pdf")
        assert result.document_map is not None
        assert result.document_map.document_kind == "TOEFL_Reading"
        assert len(result.document_map.exercises) == 1
        ex = result.document_map.exercises[0]
        assert ex.type == "reading_comprehension"
        assert ex.passage_word_count_estimate == 720
        assert "main_idea" in ex.question_subtypes
        # Legacy view derived for FE chips:
        assert len(result.analyzed_types) == 1


@pytest.mark.asyncio
async def test_generate_quiz_with_passed_document_map(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """Caller supplies a ready DocumentMap (the FE round-tripping it
    from /materials/upload). We skip classification and run Stage 2 +
    Stage 3 per exercise."""
    mock_vector_db.search_materials.return_value = [
        MaterialChunk(text="topic anchor chunk", source="doc", chunk_index=0, vector=[0.1])
    ]
    # Two AI calls in order: stimulus (passage), then questions.
    mock_ai_service.get_ai_response.side_effect = [
        '{"passage": "Generated passage about birds. ' * 5 + '"}',
        '{"questions": [{"question": "What is the topic?",'
        ' "options": ["Birds", "Cars", "Food"],'
        ' "correct_answer": "Birds",'
        ' "type": "multiple_choice",'
        ' "context_text": "Generated passage."}]}',
    ]

    doc_map = DocumentMap(
        document_kind="TOEFL_Reading",
        exercises=[
            DocumentExercise(
                type="reading_comprehension",
                passage_word_count_estimate=300,
                passage_topic_hint="bird migration",
                question_count=2,
                question_subtypes=["main_idea"],
            )
        ],
    )

    result = await material_service.generate_quiz(document_map=doc_map)

    assert isinstance(result, GenerateQuizResponse)
    assert isinstance(result.quiz, QuizContent)
    assert len(result.quiz.questions) == 1
    assert result.quiz.questions[0].context_text  # passage attached
    # Two AI calls: stimulus + questions. No classification call when
    # the caller provides the map.
    assert mock_ai_service.get_ai_response.await_count == 2


@pytest.mark.asyncio
async def test_generate_quiz_skips_stimulus_for_grammar(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """Grammar gap-fill exercises don't have a stimulus passage —
    Stage 2 should be skipped and only the questions call should fire."""
    mock_vector_db.search_materials.return_value = [
        MaterialChunk(text="grammar exercise", source="doc", chunk_index=0, vector=[0.1])
    ]
    mock_ai_service.get_ai_response.side_effect = [
        '{"questions": [{"question": "She ___ home.",'
        ' "options": ["went", "go", "goes"],'
        ' "correct_answer": "went",'
        ' "type": "fill_in_the_blank",'
        ' "context_text": null}]}',
    ]
    doc_map = DocumentMap(
        document_kind="Murphy_Grammar",
        exercises=[
            DocumentExercise(
                type="gap_fill_grammar",
                passage_word_count_estimate=None,
                question_count=1,
                grammar_focus=["past simple"],
            )
        ],
    )

    result = await material_service.generate_quiz(document_map=doc_map)
    assert isinstance(result.quiz, QuizContent)
    assert mock_ai_service.get_ai_response.await_count == 1


@pytest.mark.asyncio
async def test_generate_quiz_no_materials(
    material_service: MaterialService, mock_vector_db: MagicMock
) -> None:
    mock_vector_db.search_materials.return_value = []

    result = await material_service.generate_quiz()

    assert isinstance(result, GenerateQuizResponse)
    assert isinstance(result.quiz, str)
    assert "No relevant material" in result.quiz


# ---------- Verbatim-check unit tests (Phase 1.6) -----------------


def test_word_ngrams_below_n_is_empty() -> None:
    assert _word_ngrams("only three words here", n=12) == set()


def test_word_ngrams_lowercases_and_strips_punct() -> None:
    grams = _word_ngrams("Hello, World!", n=2)
    assert ("hello", "world") in grams


def test_verbatim_overlap_detects_12_word_match() -> None:
    src = (
        "Migration is a complex behavior driven by seasonal changes "
        "and food availability across continents."
    )
    candidate = (
        "Although ecologists differ, "
        "migration is a complex behavior driven by seasonal changes "
        "and food availability across continents — they all agree on the trigger."
    )
    assert _has_verbatim_overlap(candidate, [src], n=12) is True


def test_verbatim_overlap_ignores_short_overlap() -> None:
    src = "The quick brown fox jumps over the lazy dog."
    # Independent prose sharing only short ngrams — should not trigger.
    candidate = (
        "Foxes are clever animals that frequently outwit larger predators "
        "by using their environment to their advantage in unexpected ways."
    )
    assert _has_verbatim_overlap(candidate, [src], n=12) is False


def test_verbatim_overlap_punctuation_invariant() -> None:
    src = "She left for Madrid on Tuesday morning before anyone could stop her there."
    # Same phrase, different punctuation/case — must still be caught.
    candidate = (
        "Yes — She LEFT for MADRID, on Tuesday morning before anyone could "
        "stop her there. End."
    )
    assert _has_verbatim_overlap(candidate, [src], n=12) is True


# ---------- Discriminated-union adapter tests (Phase 1.7) ---------


def test_adapter_routes_multiple_choice() -> None:
    q = QuizQuestionAdapter.validate_python(
        {
            "type": "multiple_choice",
            "question": "Which is correct?",
            "options": ["A", "B", "C"],
            "correct_answer": "A",
            "context_text": None,
        }
    )
    assert isinstance(q, MultipleChoiceQuizQuestion)
    assert q.correct_answer == "A"


def test_adapter_routes_open() -> None:
    q = QuizQuestionAdapter.validate_python(
        {"type": "open", "question": "Why?", "options": [], "correct_answer": "Because"}
    )
    assert isinstance(q, OpenQuizQuestion)


def test_adapter_routes_fill_in_blank_with_list_answer() -> None:
    q = QuizQuestionAdapter.validate_python(
        {
            "type": "fill_in_the_blank",
            "question": "She ___ home.",
            "options": [],
            "correct_answer": ["went", "left for"],
        }
    )
    assert isinstance(q, FillInTheBlankQuizQuestion)
    assert q.correct_answer == ["went", "left for"]


def test_adapter_routes_true_false() -> None:
    q = QuizQuestionAdapter.validate_python(
        {"type": "true_false", "question": "The sky is blue.", "correct_answer": "true"}
    )
    assert isinstance(q, TrueFalseQuizQuestion)
    assert q.correct_answer == "true"


def test_adapter_rejects_invalid_true_false_value() -> None:
    """`correct_answer` for true_false MUST be lowercase literal."""
    with pytest.raises(Exception):
        QuizQuestionAdapter.validate_python(
            {
                "type": "true_false",
                "question": "The sky is blue.",
                "correct_answer": "yes",
            }
        )


def test_adapter_routes_matching() -> None:
    q = QuizQuestionAdapter.validate_python(
        {
            "type": "matching",
            "question": "Match each word to its definition.",
            "pairs": [
                {"left": "ephemeral", "right": "short-lived"},
                {"left": "perennial", "right": "lasting"},
            ],
        }
    )
    assert isinstance(q, MatchingQuizQuestion)
    assert q.pairs[0].left == "ephemeral"
    assert q.pairs[0].right == "short-lived"


def test_adapter_routes_multi_select_mc() -> None:
    q = QuizQuestionAdapter.validate_python(
        {
            "type": "multi_select_mc",
            "question": "Select all true statements.",
            "options": ["A", "B", "C", "D"],
            "correct_answers": ["A", "C"],
        }
    )
    assert isinstance(q, MultiSelectMCQuizQuestion)
    assert set(q.correct_answers) == {"A", "C"}


def test_adapter_rejects_multi_select_with_one_answer() -> None:
    """Schema enforces ≥2 correct answers — single-correct should be
    multiple_choice instead."""
    with pytest.raises(Exception):
        QuizQuestionAdapter.validate_python(
            {
                "type": "multi_select_mc",
                "question": "Pick all that apply.",
                "options": ["A", "B"],
                "correct_answers": ["A"],
            }
        )


def test_adapter_routes_cloze_passage() -> None:
    q = QuizQuestionAdapter.validate_python(
        {
            "type": "cloze_passage",
            "question": "Fill in the blanks.",
            "passage_with_blanks": "Birds fly {{1}} when winter approaches and return in {{2}}.",
            "blanks": [
                {"id": "1", "correct_answer": "south"},
                {"id": "2", "correct_answer": ["spring", "April"]},
            ],
        }
    )
    assert isinstance(q, ClozePassageQuizQuestion)
    assert q.blanks[0].id == "1"
    assert q.blanks[1].correct_answer == ["spring", "April"]


def test_adapter_rejects_unknown_type() -> None:
    with pytest.raises(Exception):
        QuizQuestionAdapter.validate_python(
            {"type": "made_up_type", "question": "?", "correct_answer": "x"}
        )


@pytest.mark.asyncio
async def test_generate_quiz_multi_variant_pipeline(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """End-to-end: a TOEFL_Reading exercise that produces one
    multiple_choice, one true_false, one matching item — the parser
    must route each to the right discriminated-union variant."""
    mock_vector_db.search_materials.return_value = [
        MaterialChunk(text="passage about birds", source="doc", chunk_index=0, vector=[0.1])
    ]
    mock_ai_service.get_ai_response.side_effect = [
        '{"passage": "Birds adapt to seasonal change in remarkable ways."}',
        '{"questions": ['
        '{"type":"multiple_choice","question":"What do birds adapt to?",'
        ' "options":["weather","food","seasons"],"correct_answer":"seasons",'
        ' "context_text":"Birds adapt..."},'
        '{"type":"true_false","question":"Birds never migrate.",'
        ' "correct_answer":"false","context_text":"Birds adapt..."},'
        '{"type":"matching","question":"Match terms.",'
        ' "pairs":[{"left":"adapt","right":"change"},{"left":"migrate","right":"travel"}],'
        ' "context_text":"Birds adapt..."}'
        ']}',
    ]
    doc_map = DocumentMap(
        exercises=[
            DocumentExercise(
                type="reading_comprehension",
                passage_word_count_estimate=200,
                passage_topic_hint="bird adaptation",
                question_count=3,
            )
        ]
    )

    result = await material_service.generate_quiz(document_map=doc_map)
    assert isinstance(result.quiz, QuizContent)
    qs = result.quiz.questions
    assert len(qs) == 3
    assert isinstance(qs[0], MultipleChoiceQuizQuestion)
    assert isinstance(qs[1], TrueFalseQuizQuestion)
    assert isinstance(qs[2], MatchingQuizQuestion)


@pytest.mark.asyncio
async def test_generate_quiz_drops_malformed_items(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """One good item + one with an invalid type must yield 1
    parsed question, not 0 and not a hard error."""
    mock_vector_db.search_materials.return_value = [
        MaterialChunk(text="x", source="doc", chunk_index=0, vector=[0.1])
    ]
    mock_ai_service.get_ai_response.side_effect = [
        '{"questions": ['
        '{"type":"multiple_choice","question":"Q?","options":["A","B"],"correct_answer":"A"},'
        '{"type":"made_up","question":"?","correct_answer":"x"}'
        ']}',
    ]
    doc_map = DocumentMap(
        exercises=[
            DocumentExercise(
                type="gap_fill_grammar",
                question_count=2,
            )
        ]
    )

    result = await material_service.generate_quiz(document_map=doc_map)
    assert isinstance(result.quiz, QuizContent)
    assert len(result.quiz.questions) == 1
    assert isinstance(result.quiz.questions[0], MultipleChoiceQuizQuestion)


@pytest.mark.asyncio
async def test_stimulus_retries_on_verbatim_overlap(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """First stimulus draft copies a 12-word span from the retrieved
    chunk. Service must retry once with a sharper warning, then pick
    the second clean draft."""
    source_phrase = (
        "Migration is a complex behavior driven by seasonal changes "
        "and food availability across continents"
    )
    mock_vector_db.search_materials.return_value = [
        MaterialChunk(text=source_phrase, source="doc", chunk_index=0, vector=[0.1]),
    ]
    # Stimulus draft #1 copies; draft #2 is clean; then questions.
    bad_passage = source_phrase + " and many other variables."
    good_passage = (
        "Birds adjust their journeys each year as climate, daylight, and "
        "available resources shift across the regions they cross. "
        "These cues guide them along familiar routes."
    )
    mock_ai_service.get_ai_response.side_effect = [
        '{"passage": "' + bad_passage + '"}',
        '{"passage": "' + good_passage + '"}',
        '{"questions": [{"question": "Q?", "options": ["A","B"],'
        ' "correct_answer": "A", "type": "multiple_choice"}]}',
    ]
    doc_map = DocumentMap(
        document_kind="TOEFL_Reading",
        exercises=[
            DocumentExercise(
                type="reading_comprehension",
                passage_word_count_estimate=200,
                passage_topic_hint="bird migration",
                question_count=1,
            )
        ],
    )

    result = await material_service.generate_quiz(document_map=doc_map)
    assert isinstance(result.quiz, QuizContent)
    # 1 retry on stimulus + 1 questions call = 3 AI calls total.
    assert mock_ai_service.get_ai_response.await_count == 3
    # The accepted passage shouldn't be the copied one.
    ctx = result.quiz.questions[0].context_text or ""
    assert source_phrase not in ctx


# ---------- Option-dedupe tests (FIX-1) -----------------------------


def test_dedupe_preserve_order_drops_exact_duplicates() -> None:
    out = _dedupe_preserve_order(["a", "b", "a", "c"])
    assert out == ["a", "b", "c"]


def test_dedupe_preserve_order_treats_case_and_whitespace_as_dupes() -> None:
    """The reproduction case from prod was a Russian MC where
    Option A and Option D were identical strings — but more
    insidious is the case where the model emits 'диагностировать ' vs
    'диагностировать' (one trailing space) and the user picks the
    'wrong' one and gets Correct! by accident."""
    out = _dedupe_preserve_order(
        ["диагностировать", "диагнозировать", "Диагностировать ", "диагностицировать"]
    )
    assert out == ["диагностировать", "диагнозировать", "диагностицировать"]


def test_dedupe_preserve_order_unicode_normalisation() -> None:
    """NFKC-fold so a precomposed character vs decomposed pair
    don't sneak past as 'distinct' options. We construct both forms
    via codepoint escapes (\u00e9 vs e+\u0301) — writing them as
    bare literals would let an editor's auto-normalise collapse them
    in source and the test would silently lose its purpose."""
    composed = "caf\u00e9"
    decomposed = "cafe\u0301"
    assert composed != decomposed
    out = _dedupe_preserve_order([composed, decomposed, "tea"])
    assert len(out) == 2


def test_dedupe_preserve_order_skips_non_strings() -> None:
    out = _dedupe_preserve_order(["a", None, 42, "b", ""])  # type: ignore[list-item]
    assert out == ["a", "b"]


@pytest.mark.asyncio
async def test_generate_questions_drops_mc_with_duplicate_options(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """End-to-end safety: when the LLM emits an MC with two
    byte-identical options, we drop that question rather than ship a
    broken one to the FE. Reproduction of the user-reported screenshot
    where Option A and Option D were both 'диагностировать' and the
    user picked the dup and got Correct!."""
    mock_vector_db.search_materials.return_value = [
        MaterialChunk(text="x", source="doc", chunk_index=0, vector=[0.1])
    ]
    mock_ai_service.get_ai_response.side_effect = [
        # 1st call: questions list with one BAD MC (dup options) and
        # one GOOD MC. Pipeline must drop the bad one only.
        '{"questions": ['
        '{"type":"multiple_choice","question":"Q1","options":["диагностировать","диагнозировать","диагностицировать","диагностировать"],"correct_answer":"диагностировать"},'
        '{"type":"multiple_choice","question":"Q2","options":["A","B","C"],"correct_answer":"A"}'
        ']}',
    ]
    doc_map = DocumentMap(
        exercises=[
            DocumentExercise(
                type="gap_fill_grammar",
                question_count=2,
            )
        ]
    )

    result = await material_service.generate_quiz(document_map=doc_map)
    assert isinstance(result.quiz, QuizContent)
    # Dedupe collapses Q1's options from 4 → 3 (one byte-dup), so the
    # question is salvaged with 3 distinct options. Q2 untouched.
    assert len(result.quiz.questions) == 2
    q1 = result.quiz.questions[0]
    assert isinstance(q1, MultipleChoiceQuizQuestion)
    assert len(q1.options) == 3, f"Q1 still has dup options: {q1.options}"
    assert "диагностировать" in q1.options
    # And the correct_answer must still be in the surviving option set.
    assert q1.correct_answer in q1.options


@pytest.mark.asyncio
async def test_generate_questions_drops_matching_with_duplicate_lefts(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """Matching variant: the renderer pairs entries by the `left`
    string, so two identical lefts silently overwrite each other in
    the user's answer state. Drop such questions wholesale."""
    mock_vector_db.search_materials.return_value = [
        MaterialChunk(text="x", source="doc", chunk_index=0, vector=[0.1])
    ]
    mock_ai_service.get_ai_response.side_effect = [
        '{"questions": ['
        '{"type":"matching","question":"Match.","pairs":'
        '[{"left":"happy","right":"sad"},{"left":"happy","right":"joyful"},{"left":"big","right":"large"}]},'
        '{"type":"matching","question":"OK match.","pairs":'
        '[{"left":"hot","right":"cold"},{"left":"up","right":"down"}]}'
        ']}',
    ]
    doc_map = DocumentMap(
        exercises=[DocumentExercise(type="matching", question_count=2)]
    )
    result = await material_service.generate_quiz(document_map=doc_map)
    assert isinstance(result.quiz, QuizContent)
    # Only the second matching survives (first had dup lefts).
    assert len(result.quiz.questions) == 1
    q = result.quiz.questions[0]
    assert isinstance(q, MatchingQuizQuestion)
    assert q.question == "OK match."
