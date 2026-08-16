"""Task templates as few-shot exemplars: mining them out of an uploaded
PDF, scoping them to their owner, and injecting them into generation.

The through-line of these tests is that the feature is additive — every
failure mode (empty table, missing table, vector-DB error, anonymous
caller) has to land on the exact prompt the generator produced before
templates existed.
"""

import pandas as pd
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from constants.prompts import (
    _exemplar_clause,
    writing_multiple_choice_task_prompt,
    writing_fill_in_the_blank_task_prompt,
)
from models.dtos.material_dtos import DocumentMap, DocumentExercise
from models.dtos.vector_db_dtos import SpecificSkillContext, TaskTemplate
from services.material_service import MaterialService
from services.vector_db_service import VectorDBService
from services.writing_task_service import WritingTaskService
from utils.user_context import UserContext

OWNER_ID = "11111111-2222-3333-4444-555555555555"
OTHER_ID = "99999999-8888-7777-6666-555555555555"


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


@pytest.fixture
def writing_service(mock_vector_db: MagicMock, mock_ai_service: MagicMock) -> WritingTaskService:
    service = WritingTaskService(mock_vector_db, mock_ai_service)
    service.verification_pipeline = MagicMock()
    return service


@pytest.fixture
def user_context() -> UserContext:
    return UserContext(
        user_id=OWNER_ID,
        user_email=None,
        user_role=None,
        authorization=None,
    )


def _stub_vector_db(table_exists: bool = True) -> VectorDBService:
    """A VectorDBService with no __init__ run against it.

    The real constructor opens LanceDB on disk and pulls down a
    SentenceTransformer; neither is needed to test the where-clause
    scoping, which is the part that actually carries a security promise.
    """
    service = object.__new__(VectorDBService)
    service.db = MagicMock()
    service.model = MagicMock()
    service.model.encode.return_value = MagicMock(tolist=lambda: [0.1, 0.2])
    service.templates_table_name = "task_templates"
    service.db.table_names.return_value = ["task_templates"] if table_exists else []
    return service


def _stub_search_result(service: VectorDBService, rows: list) -> MagicMock:
    """Wire table.search(...).limit(...).to_pandas() to return `rows`."""
    search = MagicMock()
    search.where.return_value = search
    search.limit.return_value.to_pandas.return_value = pd.DataFrame(rows)
    service.db.open_table.return_value.search.return_value = search
    return search


def test_search_task_templates_rejects_non_uuid_user_id() -> None:
    """The _UUID_RE gate is what keeps user_id out of the where-clause as
    an injectable fragment. A non-UUID must short-circuit to no results,
    NOT fall through to an unscoped search."""
    service = _stub_vector_db()
    search = _stub_search_result(
        service, [{"id": "a", "template": "t", "user_id": OWNER_ID}]
    )

    result = service.search_task_templates("query", user_id="' OR '1'='1")

    assert result == []
    search.where.assert_not_called()


def test_search_task_templates_scopes_where_clause_to_owner() -> None:
    service = _stub_vector_db()
    search = _stub_search_result(
        service, [{"id": "a", "template": "mine", "user_id": OWNER_ID}]
    )

    result = service.search_task_templates("query", limit=3, user_id=OWNER_ID)

    search.where.assert_called_once_with(f"user_id = '{OWNER_ID}'")
    assert [t.template for t in result] == ["mine"]


def test_search_task_templates_post_filters_foreign_rows() -> None:
    """If the where-clause can't be applied (older table schema), the
    defensive post-filter still has to drop another user's templates —
    otherwise user A's prompt gets shaped by user B's private upload."""
    service = _stub_vector_db()
    search = MagicMock()
    search.where.side_effect = Exception("no such column: user_id")
    search.limit.return_value.to_pandas.return_value = pd.DataFrame(
        [
            {"id": "a", "template": "mine", "user_id": OWNER_ID},
            {"id": "b", "template": "theirs", "user_id": OTHER_ID},
            {"id": "c", "template": "legacy", "user_id": ""},
        ]
    )
    service.db.open_table.return_value.search.return_value = search

    result = service.search_task_templates("query", user_id=OWNER_ID)

    assert [t.template for t in result] == ["mine"]


def test_search_task_templates_missing_table_returns_empty() -> None:
    """Fresh install: the table has never been created."""
    service = _stub_vector_db(table_exists=False)

    assert service.search_task_templates("query", user_id=OWNER_ID) == []


def test_search_task_templates_swallows_errors() -> None:
    service = _stub_vector_db()
    service.db.open_table.side_effect = Exception("lancedb exploded")

    assert service.search_task_templates("query", user_id=OWNER_ID) == []


def test_save_task_templates_fills_missing_id_and_drops_distance() -> None:
    """`distance` only exists on rows that came back out of a search, and
    a null id would make LanceDB type the column as null. Neither may
    reach the written row."""
    service = _stub_vector_db(table_exists=False)
    service.model.encode.return_value = [MagicMock(tolist=lambda: [0.1, 0.2])]

    service.save_task_templates(
        [TaskTemplate(template="body", user_id=OWNER_ID, **{"_distance": 0.5})]
    )

    written = service.db.create_table.call_args.kwargs["data"]
    assert "distance" not in written.columns
    assert written["id"].iloc[0]
    assert written["user_id"].iloc[0] == OWNER_ID


def test_save_task_templates_noop_on_empty_list() -> None:
    service = _stub_vector_db()

    service.save_task_templates([])

    service.db.create_table.assert_not_called()
    service.db.open_table.assert_not_called()


def test_build_task_templates_carries_owner_and_skill() -> None:
    document_map = DocumentMap(
        document_kind="Cambridge_FCE",
        exercises=[
            DocumentExercise(
                type="reading_comprehension",
                passage_topic_hint="urban beekeeping",
                passage_word_count_estimate=400,
                question_count=6,
                question_subtypes=["main_idea", "inference"],
                grammar_focus=["past perfect"],
                example="What does the author suggest about hives?",
            ),
            DocumentExercise(type="gap_fill_grammar", question_count=8),
        ],
    )

    templates = MaterialService._build_task_templates(
        document_map=document_map, source="fce.pdf", owner_id=OWNER_ID
    )

    assert len(templates) == 2
    assert {t.user_id for t in templates} == {OWNER_ID}
    assert {t.source for t in templates} == {"fce.pdf"}
    assert templates[0].task_type == "reading_comprehension"
    assert templates[0].skill == "reading"
    assert templates[1].skill == "writing"
    body = templates[0].template
    assert "urban beekeeping" in body
    assert "main_idea, inference" in body
    assert "Cambridge_FCE" in body
    assert templates[0].id


def test_build_task_templates_leaves_level_empty() -> None:
    """The classification pass never reports a CEFR level. Inventing one
    would put a fabricated filter into retrieval."""
    document_map = DocumentMap(
        document_kind="TOEFL_Reading",
        exercises=[DocumentExercise(type="reading_comprehension")],
    )

    templates = MaterialService._build_task_templates(
        document_map=document_map, source="toefl.pdf", owner_id=OWNER_ID
    )

    assert templates[0].level == ""


def test_build_task_templates_anonymous_upload_gets_empty_owner() -> None:
    document_map = DocumentMap(
        exercises=[DocumentExercise(type="multiple_choice")]
    )

    templates = MaterialService._build_task_templates(
        document_map=document_map, source="x.pdf", owner_id=None
    )

    assert templates[0].user_id == ""


def test_build_task_templates_skips_blank_types() -> None:
    document_map = DocumentMap(
        exercises=[
            DocumentExercise(type="   "),
            DocumentExercise(type="essay"),
        ]
    )

    templates = MaterialService._build_task_templates(
        document_map=document_map, source="x.pdf", owner_id=OWNER_ID
    )

    assert [t.task_type for t in templates] == ["essay"]


@pytest.mark.asyncio
async def test_process_pdf_persists_task_templates(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
    user_context: UserContext,
) -> None:
    with patch("services.material_service.PdfReader") as MockPdfReader:
        page = MagicMock()
        page.extract_text.return_value = "A reading passage about bees."
        MockPdfReader.return_value.pages = [page]
        mock_ai_service.get_ai_response.return_value = (
            '{"document_kind": "Cambridge_FCE", "exercises": ['
            '{"type": "reading_comprehension", "question_count": 5, '
            '"question_subtypes": ["detail"], "grammar_focus": [], '
            '"example": "Why do bees swarm?"}]}'
        )

        await material_service.process_pdf(
            b"%PDF-1.4...", "fce.pdf", user_context=user_context
        )

    mock_vector_db.save_task_templates.assert_called_once()
    saved = mock_vector_db.save_task_templates.call_args[0][0]
    assert [t.task_type for t in saved] == ["reading_comprehension"]
    assert saved[0].user_id == OWNER_ID
    assert mock_vector_db.save_chunks.call_args.kwargs["user_id"] == OWNER_ID


@pytest.mark.asyncio
async def test_process_pdf_survives_template_save_failure(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """The user's chunks are already indexed by the time templates are
    written, so a failing template write must not cost them the upload."""
    with patch("services.material_service.PdfReader") as MockPdfReader:
        page = MagicMock()
        page.extract_text.return_value = "Some text."
        MockPdfReader.return_value.pages = [page]
        mock_ai_service.get_ai_response.return_value = (
            '{"document_kind": "Mixed", "exercises": [{"type": "essay"}]}'
        )
        mock_vector_db.save_task_templates.side_effect = Exception("lancedb down")

        result = await material_service.process_pdf(b"%PDF-1.4...", "x.pdf")

    assert result.status == "success"
    assert result.document_map is not None


@pytest.mark.asyncio
async def test_process_pdf_skips_templates_for_legacy_shape(
    material_service: MaterialService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
) -> None:
    """The legacy `{types: [...]}` response yields no DocumentMap, so
    there is nothing to mine — and nothing should be written."""
    with patch("services.material_service.PdfReader") as MockPdfReader:
        page = MagicMock()
        page.extract_text.return_value = "Some text."
        MockPdfReader.return_value.pages = [page]
        mock_ai_service.get_ai_response.return_value = (
            '{"types": [{"type": "multiple_choice", "example": "ex"}]}'
        )

        await material_service.process_pdf(b"%PDF-1.4...", "x.pdf")

    mock_vector_db.save_task_templates.assert_not_called()


def test_retrieve_exemplars_returns_template_bodies(
    writing_service: WritingTaskService,
    mock_vector_db: MagicMock,
    user_context: UserContext,
) -> None:
    mock_vector_db.search_task_templates.return_value = [
        TaskTemplate(template="Exercise type: multiple_choice", user_id=OWNER_ID),
        TaskTemplate(template="Exercise type: gap_fill_grammar", user_id=OWNER_ID),
    ]

    exemplars = writing_service._retrieve_exemplars(
        level="B1", skill="writing", task_type="multiple_choice",
        user_context=user_context,
    )

    assert exemplars == [
        "Exercise type: multiple_choice",
        "Exercise type: gap_fill_grammar",
    ]
    assert mock_vector_db.search_task_templates.call_args.kwargs["user_id"] == OWNER_ID


def test_retrieve_exemplars_without_user_context_is_empty(
    writing_service: WritingTaskService,
    mock_vector_db: MagicMock,
) -> None:
    exemplars = writing_service._retrieve_exemplars(
        level="B1", skill="writing", task_type="multiple_choice", user_context=None
    )

    assert exemplars == []
    mock_vector_db.search_task_templates.assert_not_called()


def test_retrieve_exemplars_swallows_vector_db_errors(
    writing_service: WritingTaskService,
    mock_vector_db: MagicMock,
    user_context: UserContext,
) -> None:
    mock_vector_db.search_task_templates.side_effect = Exception("lancedb down")

    assert writing_service._retrieve_exemplars(
        level="B1", skill="writing", task_type="multiple_choice",
        user_context=user_context,
    ) == []


def test_retrieve_exemplars_truncates_oversized_templates(
    writing_service: WritingTaskService,
    mock_vector_db: MagicMock,
    user_context: UserContext,
) -> None:
    mock_vector_db.search_task_templates.return_value = [
        TaskTemplate(template="x" * 5000, user_id=OWNER_ID)
    ]

    exemplars = writing_service._retrieve_exemplars(
        level="B1", skill="writing", task_type="multiple_choice",
        user_context=user_context,
    )

    assert len(exemplars[0]) == 400


def test_retrieve_exemplars_drops_blank_templates(
    writing_service: WritingTaskService,
    mock_vector_db: MagicMock,
    user_context: UserContext,
) -> None:
    mock_vector_db.search_task_templates.return_value = [
        TaskTemplate(template="   ", user_id=OWNER_ID),
        TaskTemplate(template="real one", user_id=OWNER_ID),
    ]

    exemplars = writing_service._retrieve_exemplars(
        level="B1", skill="writing", task_type="multiple_choice",
        user_context=user_context,
    )

    assert exemplars == ["real one"]


@pytest.mark.parametrize("nothing_retrieved", [None, []])
def test_exemplar_clause_contributes_literally_nothing(nothing_retrieved) -> None:
    """The clause must be the empty string, not a short header.

    The prompt builders interpolate it as `{lesson_hint}{clause}`, so
    only "" collapses back to the exact pre-exemplar prompt. Asserting
    the two builders merely agree with each other would pass even if the
    clause always emitted a stub, which is why this checks the value.
    """
    assert _exemplar_clause(nothing_retrieved) == ""


@pytest.mark.parametrize(
    "builder",
    [writing_multiple_choice_task_prompt, writing_fill_in_the_blank_task_prompt],
)
def test_empty_exemplars_leave_prompt_byte_identical(builder) -> None:
    """The core fail-safe promise: no exemplars must mean the exact
    prompt the generator produced before this feature existed."""
    args = ("English", "B1", {"description": "desc"})
    baseline = builder(*args, seed="abc")

    assert builder(*args, seed="abc", exemplars=None) == baseline
    assert builder(*args, seed="abc", exemplars=[]) == baseline
    assert "FORMAT REFERENCE" not in baseline
    assert "--- EXAMPLE" not in baseline


@pytest.mark.parametrize(
    "builder",
    [writing_multiple_choice_task_prompt, writing_fill_in_the_blank_task_prompt],
)
def test_exemplars_appear_in_prompt(builder) -> None:
    prompt = builder(
        "English", "B1", {"description": "desc"}, seed="abc",
        exemplars=["Exercise type: reading_comprehension", "Grammar focus: past perfect"],
    )

    assert "FORMAT REFERENCE" in prompt
    assert "Exercise type: reading_comprehension" in prompt
    assert "Grammar focus: past perfect" in prompt
    assert "--- EXAMPLE 1 ---" in prompt
    assert "--- EXAMPLE 2 ---" in prompt
    assert "Do NOT" in prompt


@pytest.mark.asyncio
async def test_generation_injects_retrieved_exemplars(
    writing_service: WritingTaskService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
    user_context: UserContext,
) -> None:
    mock_vector_db.get_level_context.return_value = SpecificSkillContext(
        level="B1", skill_type="writing", description="desc"
    )
    mock_vector_db.search_task_templates.return_value = [
        TaskTemplate(template="Exercise type: gap_fill_grammar", user_id=OWNER_ID)
    ]
    mock_ai_service.get_ai_response.return_value = (
        '{"question": "She ____ home.", "options": ["went", "go"], "correctAnswer": "went"}'
    )

    await writing_service.generate_writing_multiple_choice_task(
        "English", "B1", user_context=user_context
    )

    prompt = mock_ai_service.get_ai_response.call_args[0][0]
    assert "Exercise type: gap_fill_grammar" in prompt


@pytest.mark.asyncio
async def test_generation_unaffected_when_store_is_empty(
    writing_service: WritingTaskService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
    user_context: UserContext,
) -> None:
    """Empty store degrades to the plain generator — the task still comes
    back and the prompt carries no exemplar block."""
    mock_vector_db.get_level_context.return_value = SpecificSkillContext(
        level="B1", skill_type="writing", description="desc"
    )
    mock_vector_db.search_task_templates.return_value = []
    mock_ai_service.get_ai_response.return_value = (
        '{"question": "She ____ home.", "options": ["went", "go"], "correctAnswer": "went"}'
    )

    task = await writing_service.generate_writing_multiple_choice_task(
        "English", "B1", user_context=user_context
    )

    assert task.question == "She ____ home."
    assert "FORMAT REFERENCE" not in mock_ai_service.get_ai_response.call_args[0][0]


@pytest.mark.asyncio
async def test_generation_survives_retrieval_error(
    writing_service: WritingTaskService,
    mock_vector_db: MagicMock,
    mock_ai_service: MagicMock,
    user_context: UserContext,
) -> None:
    """A missing exemplar must never break a lesson."""
    mock_vector_db.get_level_context.return_value = SpecificSkillContext(
        level="B1", skill_type="writing", description="desc"
    )
    mock_vector_db.search_task_templates.side_effect = Exception("lancedb down")
    mock_ai_service.get_ai_response.return_value = (
        '{"question": "This is ___.", "correctAnswer": "test"}'
    )

    task = await writing_service.generate_writing_fill_in_the_blank_task(
        "English", "B1", user_context=user_context
    )

    assert task.correct_answer == ["test"]
