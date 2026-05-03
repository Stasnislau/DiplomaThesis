import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch
from services.listening_task_service import ListeningTaskService
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.responses.listening_task_response import ListeningTaskResponse


@pytest.fixture
def mock_ai_service() -> MagicMock:
    service = MagicMock()
    service.get_ai_response = AsyncMock()
    return service


@pytest.fixture
def listening_service(mock_ai_service: MagicMock) -> ListeningTaskService:
    return ListeningTaskService(mock_ai_service)


@pytest.mark.asyncio
async def test_create_listening_task_success(
    listening_service: ListeningTaskService,
    mock_ai_service: MagicMock,
    tmp_path,
) -> None:
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

    audio_dir = tmp_path / "static" / "audio"
    audio_bytes = b"fake-tts-audio-bytes"

    with patch(
        "services.listening_task_service.tts_service.synthesize",
        return_value=audio_bytes,
    ) as mock_synthesize, patch(
        "services.listening_task_service.os.makedirs"
    ) as mock_makedirs, patch(
        "services.listening_task_service.aiofiles.open"
    ) as mock_aio_open:
        ctx = MagicMock()
        file_handle = AsyncMock()
        ctx.__aenter__.return_value = file_handle
        ctx.__aexit__.return_value = None
        mock_aio_open.return_value = ctx

        request = ListeningTaskRequest(language="English", level="A1")
        result = await listening_service.create_listening_task(request)

        assert isinstance(result, ListeningTaskResponse)
        assert result.transcript == "Once upon a time..."
        assert len(result.questions) == 1
        assert result.questions[0].type == "multiple_choice"
        assert result.audioUrl.endswith(".mp3")
        assert "/static/audio/" in result.audioUrl

        mock_ai_service.get_ai_response.assert_awaited_once()
        mock_synthesize.assert_called_once_with(
            "Once upon a time...", "English", "A1"
        )
        mock_makedirs.assert_called_once()
        file_handle.write.assert_called_once_with(audio_bytes)

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
