import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from services.speaking_service import SpeakingService
from models.responses.speaking_analysis_response import SpeakingAnalysisResponse

@pytest.fixture
def mock_ai_service() -> MagicMock:
    service = MagicMock()
    service.get_ai_response = AsyncMock()
    return service

@pytest.fixture
def speaking_service(mock_ai_service: MagicMock) -> SpeakingService:
    return SpeakingService(mock_ai_service)

@pytest.mark.asyncio
async def test_analyze_user_audio_success(speaking_service: SpeakingService, mock_ai_service: MagicMock) -> None:
    with patch("services.speaking_service.get_whisper_model") as mock_get_model, \
         patch("services.speaking_service.AudioSegment") as MockAudioSegment:
        
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model
        
        mock_audio = MagicMock()
        MockAudioSegment.from_file.return_value = mock_audio
        mock_audio.set_channels.return_value = mock_audio
        mock_audio.set_frame_rate.return_value = mock_audio
        mock_audio.get_array_of_samples.return_value = [0.1, 0.2]
        
        mock_model.transcribe.return_value = {
            "text": "Hello world.",
            "language": "en",
            "segments": []
        }
        
        mock_ai_service.get_ai_response.return_value = """
        {
            "overall_assessment": "Good.",
            "identified_errors": [],
            "positive_points": [],
            "areas_for_improvement": []
        }
        """

        audio_bytes = b"fake audio data"
        result = await speaking_service.analyze_user_audio(audio_bytes, "test.mp3", "English")

        assert isinstance(result, SpeakingAnalysisResponse)
        assert result.overall_assessment == "Good."
        assert result.transcription == "Hello world."
        assert result.identified_errors == []
        assert result.pronunciation is not None
        
        mock_get_model.assert_called()
        mock_ai_service.get_ai_response.assert_called()

@pytest.mark.asyncio
async def test_analyze_user_audio_no_speech(speaking_service: SpeakingService, mock_ai_service: MagicMock) -> None:
    with patch("services.speaking_service.get_whisper_model") as mock_get_model, \
         patch("services.speaking_service.AudioSegment") as MockAudioSegment:
        
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model
        
        mock_audio = MagicMock()
        MockAudioSegment.from_file.return_value = mock_audio
        mock_audio.set_channels.return_value = mock_audio
        mock_audio.set_frame_rate.return_value = mock_audio
        mock_audio.get_array_of_samples.return_value = [0]
        
        mock_model.transcribe.return_value = {
            "text": " ",
            "language": "en",
            "segments": []
        }
        
        audio_bytes = b"silence"
        result = await speaking_service.analyze_user_audio(audio_bytes)
        
        assert isinstance(result, SpeakingAnalysisResponse)
        assert "Could not transcribe any speech" in result.overall_assessment
        assert result.transcription == ""
        assert result.pronunciation.fluency_score == 0.0

@pytest.mark.asyncio
async def test_analyze_user_audio_whisper_failure(speaking_service: SpeakingService) -> None:
    with patch("services.speaking_service.get_whisper_model") as mock_get_model:
        mock_model = MagicMock()
        mock_get_model.return_value = mock_model
        
        mock_model.transcribe.side_effect = Exception("Whisper failed")
        
        with pytest.raises(Exception, match="Failed to transcribe"):
             await speaking_service.analyze_user_audio(b"audio")

@pytest.mark.asyncio
async def test_get_whisper_model_lazy_loading() -> None:
    pass
