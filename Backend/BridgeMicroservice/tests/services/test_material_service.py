import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from services.material_service import MaterialService
from models.dtos.material_dtos import ProcessPdfResponse, GenerateQuizResponse, ChunkMetadata, QuizContent
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
async def test_process_pdf_success(material_service: MaterialService, mock_vector_db: MagicMock, mock_ai_service: MagicMock) -> None:
    with patch("services.material_service.PdfReader") as MockPdfReader:
        mock_pdf = MockPdfReader.return_value
        page = MagicMock()
        page.extract_text.return_value = "Chunk of text."
        mock_pdf.pages = [page]
        
        mock_ai_service.get_ai_response.return_value = '{"types": [{"type": "multiple_choice", "example": "ex"}]}'

        content = b"%PDF-1.4..."
        result = await material_service.process_pdf(content, "test.pdf")

        assert isinstance(result, ProcessPdfResponse)
        assert result.filename == "test.pdf"
        assert result.status == "success"
        
        mock_vector_db.save_chunks.assert_called_once()
        args, _ = mock_vector_db.save_chunks.call_args
        assert len(args[0]) >= 1 
        assert isinstance(args[1][0], ChunkMetadata)

@pytest.mark.asyncio
async def test_generate_quiz_success(material_service: MaterialService, mock_vector_db: MagicMock, mock_ai_service: MagicMock) -> None:
    mock_vector_db.search_materials.return_value = [
        MaterialChunk(text="content", source="doc", chunk_index=0, vector=[0.1])
    ]

    mock_ai_service.get_ai_response.return_value = '{"questions": [{"question": "q1", "type": "open", "correct_answer": "a", "options": []}]}'

    result = await material_service.generate_quiz()

    assert isinstance(result, GenerateQuizResponse)
    assert isinstance(result.quiz, QuizContent)
    assert len(result.quiz.questions) == 1
    assert result.quiz.questions[0].question == "q1"

@pytest.mark.asyncio
async def test_generate_quiz_no_materials(material_service: MaterialService, mock_vector_db: MagicMock) -> None:
    mock_vector_db.search_materials.return_value = []
    
    result = await material_service.generate_quiz()
    
    assert isinstance(result, GenerateQuizResponse)
    assert isinstance(result.quiz, str)
    assert "No relevant material" in result.quiz
