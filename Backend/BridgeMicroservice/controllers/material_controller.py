from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body, Request
from services.material_service import MaterialService
from services.vector_db_service import VectorDBService
from services.ai_service import AI_Service
from pydantic import BaseModel
import logging
from models.base_response import BaseResponse
from models.dtos.material_dtos import ProcessPdfResponse, GenerateQuizResponse, DocumentMap
from utils.user_context import extract_user_context

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/materials", tags=["materials"])


def get_material_service() -> MaterialService:
    vector_db = VectorDBService()
    ai_service = AI_Service()
    return MaterialService(vector_db, ai_service)


class GenerateQuizRequest(BaseModel):
    selected_types: Optional[List[str]] = None
    target_language: Optional[str] = None
    # When the FE round-trips the DocumentMap from /materials/upload,
    # we skip the re-classification step and feed Stage 2/3 directly.
    # Optional so older clients still work — backend re-derives the
    # map from indexed material when this is missing.
    document_map: Optional[DocumentMap] = None


class MaterialsErrorExample(BaseModel):
    """Wrong-answer trace from a finished materials quiz session.
    Same shape as ListeningErrorExample / speaking errorExamples so
    `derive_adaptive_focus` can read all task types uniformly."""

    type: Optional[str] = None
    text: Optional[str] = None
    suggestion: Optional[str] = None


class MaterialsResultRequest(BaseModel):
    language: Optional[str] = None
    level: Optional[str] = None
    score: int
    questionCount: int
    correctCount: int
    questionTypes: List[str] = []
    errorExamples: List[MaterialsErrorExample] = []
    documentKind: Optional[str] = None
    model_config = {"populate_by_name": True}


@router.post("/upload", response_model=BaseResponse[ProcessPdfResponse])
async def upload_pdf(request: Request, file: UploadFile = File(...), service: MaterialService = Depends(get_material_service)) -> BaseResponse[ProcessPdfResponse]:
    from utils.error_codes import (
        FILE_NAME_REQUIRED,
        FILE_TYPE_PDF_ONLY,
        FILE_PROCESSING_FAILED,
        TASK_GENERATION_FAILED,
        raise_with_code,
    )
    user_context = extract_user_context(request)
    logger.info(f"Received file upload request: {file.filename}")
    if not file.filename:
        raise_with_code(FILE_NAME_REQUIRED, 400, "File name is required")

    if not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Rejected non-PDF file: {file.filename}")
        raise_with_code(FILE_TYPE_PDF_ONLY, 400, "Only PDF files are supported")

    try:
        content = await file.read()
        logger.info(f"File read successfully, size: {len(content)} bytes. Starting processing...")
        result = await service.process_pdf(content, file.filename, user_context=user_context)
        logger.info("PDF processed successfully.")
        return BaseResponse[ProcessPdfResponse](success=True, payload=result)
    except HTTPException:
        # process_pdf raises HTTPException with structured detail codes
        # (PDF_NO_TEXT / PDF_GARBLED_TEXT / PDF_AI_REJECTED). Pass them
        # through unchanged so the frontend can branch on the prefix.
        raise
    except Exception as e:
        logger.error(f"Error uploading/processing PDF: {str(e)}", exc_info=True)
        raise_with_code(FILE_PROCESSING_FAILED, 500, str(e))


@router.post("/quiz", response_model=BaseResponse[GenerateQuizResponse])
async def generate_quiz(
    request: Request,
    body: GenerateQuizRequest = Body(...),
    service: MaterialService = Depends(get_material_service)
) -> BaseResponse[GenerateQuizResponse]:
    from utils.error_codes import TASK_GENERATION_FAILED, raise_with_code
    user_context = extract_user_context(request)
    logger.info(f"Received quiz generation request. Selected types: {body.selected_types}")
    try:
        result = await service.generate_quiz(
            body.selected_types,
            user_context=user_context,
            target_language=body.target_language,
            document_map=body.document_map,
        )

        logger.info("Quiz generated successfully.")
        return BaseResponse[GenerateQuizResponse](success=True, payload=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}", exc_info=True)
        raise_with_code(TASK_GENERATION_FAILED, 500, str(e))


@router.post("/result", response_model=BaseResponse[bool])
async def log_materials_result(
    request: Request, body: MaterialsResultRequest
) -> BaseResponse[bool]:
    """Persist the outcome of a finished materials-quiz session so
    the adaptive loop can mine which question types / topics the user
    is failing on. Without this, /materials/quiz logs only the
    GENERATION (with score=null) and the user's actual performance
    is invisible to derive_adaptive_focus."""
    from services.user_service import UserService
    from utils.language_codes import to_iso_language

    user_context = extract_user_context(request)
    user_service = UserService()

    await user_service.log_task_history(
        user_context,
        {
            "taskType": "materials",
            "title": "Materials quiz result",
            "score": body.score,
            "language": to_iso_language(body.language) if body.language else None,
            "metadata": {
                "errorTypes": [
                    e.type for e in body.errorExamples if e.type
                ][:5],
                "errorExamples": [
                    {
                        "type": e.type or "",
                        "text": (e.text or "")[:160],
                        "suggestion": (e.suggestion or "")[:160],
                    }
                    for e in body.errorExamples[:5]
                ],
                "weaknesses": (
                    [f"materials: {body.documentKind or 'mixed'}"]
                    if body.score < 60
                    else []
                ),
                "questionCount": body.questionCount,
                "correctCount": body.correctCount,
                "questionTypes": body.questionTypes,
                "documentKind": body.documentKind,
            },
        },
    )
    return BaseResponse[bool](success=True, payload=True)
