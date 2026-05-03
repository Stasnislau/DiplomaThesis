import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from services.placement_service import PlacementService
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.evaluate_test_dto import EvaluateTestDto
from models.dtos.placement_dtos import PlacementAnswer, PlacementTestAnswer

@pytest.fixture
def mock_ai_service() -> MagicMock:
    service = MagicMock()
    service.get_ai_response = AsyncMock()
    return service

@pytest.fixture
def mock_vector_db() -> MagicMock:
    return MagicMock()

@pytest.fixture
def placement_service(mock_ai_service: MagicMock, mock_vector_db: MagicMock) -> PlacementService:
    return PlacementService(mock_ai_service, mock_vector_db)

@pytest.mark.asyncio
async def test_generate_placement_task(placement_service: PlacementService, mock_ai_service: MagicMock) -> None:
    mock_writing_service = AsyncMock()
    placement_service.writing_task_service = mock_writing_service
    
    mock_task = MultipleChoiceTask(id="1", type="multiple_choice", question="Q?", options=[], correct_answer="A")
    mock_writing_service.generate_writing_multiple_choice_task.return_value = mock_task
    
    with patch("random.choice", return_value="multiple_choice"):
        result = await placement_service.generate_placement_task("English")
    
    assert result == mock_task
    
@pytest.mark.asyncio
async def test_adjust_difficulty_one_correct_does_not_bump(placement_service: PlacementService) -> None:
    """New 2-of-3 streak rule: a single correct answer must not bump the level
    (used to be +1 immediately, which made the final level very noisy)."""
    placement_service.current_level = "B1"
    placement_service.adjust_difficulty(was_correct=True)
    assert placement_service.current_level == "B1"


@pytest.mark.asyncio
async def test_adjust_difficulty_two_correct_bumps(placement_service: PlacementService) -> None:
    placement_service.current_level = "B1"
    placement_service.adjust_difficulty(was_correct=True)
    placement_service.adjust_difficulty(was_correct=True)
    assert placement_service.current_level == "B2"


@pytest.mark.asyncio
async def test_adjust_difficulty_one_wrong_drops(placement_service: PlacementService) -> None:
    placement_service.current_level = "B1"
    placement_service.adjust_difficulty(was_correct=False)
    assert placement_service.current_level == "A2"


@pytest.mark.asyncio
async def test_adjust_difficulty_streak_resets_after_miss(placement_service: PlacementService) -> None:
    """One miss must reset the streak — three correct after a miss must
    bump exactly once, not multiple times."""
    placement_service.current_level = "B1"
    placement_service.adjust_difficulty(was_correct=True)   # streak=[T]
    placement_service.adjust_difficulty(was_correct=False)  # drop to A2, streak reset
    assert placement_service.current_level == "A2"
    placement_service.adjust_difficulty(was_correct=True)   # streak=[T]
    assert placement_service.current_level == "A2"
    placement_service.adjust_difficulty(was_correct=True)   # streak=[T,T] -> bump
    assert placement_service.current_level == "B1"


@pytest.mark.asyncio
async def test_per_user_state_isolated(mock_ai_service: MagicMock, mock_vector_db: MagicMock) -> None:
    """Two users running placements in parallel must not see each
    other's level. Previous design had self.current_level on the service
    instance, which is shared across requests."""
    from utils.user_context import UserContext
    service = PlacementService(mock_ai_service, mock_vector_db)
    ctx_a = UserContext(user_id="user-a", user_email=None, user_role=None, authorization=None)
    ctx_b = UserContext(user_id="user-b", user_email=None, user_role=None, authorization=None)

    sess_a = service._session_for(ctx_a)
    sess_b = service._session_for(ctx_b)
    sess_a.current_level = "C1"
    sess_b.current_level = "A1"

    assert service._session_for(ctx_a).current_level == "C1"
    assert service._session_for(ctx_b).current_level == "A1"

@pytest.mark.asyncio
async def test_evaluate_test_results(placement_service: PlacementService, mock_ai_service: MagicMock) -> None:
    answers = [
        PlacementTestAnswer(question="q1", user_answer="a", is_correct=True),
        PlacementTestAnswer(question="q2", user_answer="b", is_correct=False)
    ]
    
    mock_ai_service.get_ai_response.return_value = """
    {
        "level": "B1",
        "confidence": 80,
        "strengths": ["Vocab"],
        "weaknesses": ["Grammar"],
        "recommendation": "Study more"
    }
    """
    
    result = await placement_service.evaluate_test_results(answers, "English")
    
    assert isinstance(result, EvaluateTestDto)
    assert result.level == "B1"
    assert result.confidence == 80

@pytest.mark.asyncio
async def test_evaluate_test_results_empty(placement_service: PlacementService) -> None:
    with pytest.raises(ValueError, match="cannot be empty"):
        await placement_service.evaluate_test_results([], "English")
