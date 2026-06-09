import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from services.writing_task_service import WritingTaskService
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.vector_db_dtos import SpecificSkillContext
from models.request.explain_answer_request import ExplainAnswerRequest
from models.responses.explain_answer_response import ExplainAnswerResponse
from pipelines.verification_pipeline import VerificationResult


@pytest.fixture
def mock_vector_db() -> MagicMock:
    service = MagicMock()
    service.get_level_context = MagicMock()
    return service


@pytest.fixture
def mock_ai_service() -> MagicMock:
    service = MagicMock()
    service.get_ai_response = AsyncMock()
    return service


@pytest.fixture
def writing_service(mock_vector_db: MagicMock, mock_ai_service: MagicMock) -> WritingTaskService:
    service = WritingTaskService(mock_vector_db, mock_ai_service)
    service.verification_pipeline = MagicMock()
    service.verification_pipeline.verify_task = AsyncMock()
    verification_result = MagicMock(spec=VerificationResult)
    verification_result.is_valid = True
    service.verification_pipeline.verify_task.return_value = verification_result
    return service

@pytest.mark.asyncio
async def test_generate_writing_multiple_choice_task(writing_service: WritingTaskService, mock_vector_db: MagicMock, mock_ai_service: MagicMock) -> None:
    mock_vector_db.get_level_context.return_value = SpecificSkillContext(
        level="A1", skill_type="writing", description="desc"
    )
    
    mock_ai_service.get_ai_response.return_value = """
    {
        "question": "What is it?",
        "options": ["A", "B"],
        "correctAnswer": "A",
        "description": "desc"
    }
    """
    
    task = await writing_service.generate_writing_multiple_choice_task("English", "A1")
    
    assert isinstance(task, MultipleChoiceTask)
    assert task.question == "What is it?"
    assert task.correct_answer == "A"

@pytest.mark.asyncio
async def test_generate_writing_fill_in_the_blank_task(writing_service: WritingTaskService, mock_vector_db: MagicMock, mock_ai_service: MagicMock) -> None:
    mock_vector_db.get_level_context.return_value = SpecificSkillContext(
        level="A1", skill_type="writing", description="desc"
    )
    
    mock_ai_service.get_ai_response.return_value = """
    {
        "question": "This is ___.",
        "correctAnswer": "test"
    }
    """
    
    task = await writing_service.generate_writing_fill_in_the_blank_task("English", "A1")
    
    assert isinstance(task, FillInTheBlankTask)
    assert task.correct_answer == ["test"]

@pytest.mark.asyncio
async def test_explain_answer(writing_service: WritingTaskService, mock_ai_service: MagicMock) -> None:
    mock_ai_service.get_ai_response.return_value = """
    {
        "isCorrect": false,
        "explanation": "Wrong because..."
    }
    """
    
    request = ExplainAnswerRequest(
        language="English",
        level="A1",
        task="Task...",
        correct_answer="A",
        user_answer="B"
    )
    
    result = await writing_service.explain_answer(request)
    
    assert isinstance(result, ExplainAnswerResponse)
    assert result.explanation == "Wrong because..."

@pytest.mark.asyncio
async def test_generate_task_invalid_level(writing_service: WritingTaskService, mock_vector_db: MagicMock) -> None:
    mock_vector_db.get_level_context.return_value = None
    
    with pytest.raises(ValueError, match="Invalid level"):
        await writing_service.generate_writing_multiple_choice_task("English", "INVALID")
