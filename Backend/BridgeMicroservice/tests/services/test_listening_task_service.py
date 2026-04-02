import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch, mock_open
from services.listening_task_service import ListeningTaskService
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.responses.listening_task_response import ListeningTaskResponse

from typing import Generator
@pytest.fixture
def mock_ai_service() -> MagicMock:
    service = MagicMock()
    service.get_ai_response = AsyncMock()
    return service

@pytest.fixture
def mock_elevenlabs() -> Generator[MagicMock, None, None]:
    with patch("services.listening_task_service.elevenlabs_client") as mock:
        yield mock

@pytest.fixture
def listening_service(mock_ai_service: MagicMock) -> ListeningTaskService:
    return ListeningTaskService(mock_ai_service)

@pytest.mark.asyncio
async def test_create_listening_task_success(listening_service: ListeningTaskService, mock_ai_service: MagicMock, mock_elevenlabs: MagicMock) -> None:
    mock_ai_service.get_ai_response.return_value = json.dumps({
        "transcript": "Once upon a time...",
        "questions": [
            {
                "type": "multiple_choice",
                "question": "What happened?",
                "options": ["Nothing", "Something", "Everything"],
                "correctAnswer": "Something"
            }
        ]
    })
    
    mock_elevenlabs.text_to_speech.convert.return_value = [b"chunk1", b"chunk2"]

    m = mock_open()
    with patch("aiofiles.open") as mock_aio_open:
        context_manager = MagicMock()
        mock_aio_open.return_value = context_manager
        
        file_handle = AsyncMock()
        context_manager.__aenter__.return_value = file_handle
        context_manager.__aexit__.return_value = None
        
        request = ListeningTaskRequest(language="English", level="A1")
        result = await listening_service.create_listening_task(request)

        assert isinstance(result, ListeningTaskResponse)
        assert result.transcript == "Once upon a time..."
        assert len(result.questions) == 1
        assert result.questions[0].type == "multiple_choice"
        assert "static/audio" in result.audioUrl

        mock_ai_service.get_ai_response.assert_called_once()
        mock_elevenlabs.text_to_speech.convert.assert_called_once()
        file_handle.write.assert_any_call(b"chunk1")

@pytest.mark.asyncio
async def test_create_listening_task_ai_failure(listening_service: ListeningTaskService, mock_ai_service: MagicMock) -> None:
    mock_ai_service.get_ai_response.side_effect = Exception("AI Error")
    
    request = ListeningTaskRequest(language="English", level="A1")
    
    with pytest.raises(Exception):
        await listening_service.create_listening_task(request)

@pytest.mark.asyncio
async def test_create_listening_task_invalid_json(listening_service: ListeningTaskService, mock_ai_service: MagicMock) -> None:
    mock_ai_service.get_ai_response.return_value = "invalid json"
    
    request = ListeningTaskRequest(language="English", level="A1")
    
    with pytest.raises(ValueError, match="Failed to parse AI response"):
        await listening_service.create_listening_task(request)
