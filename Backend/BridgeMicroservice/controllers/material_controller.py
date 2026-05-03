from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body, Request
from services.material_service import MaterialService
from services.vector_db_service import VectorDBService
from services.ai_service import AI_Service
from pydantic import BaseModel
import logging
from models.base_response import BaseResponse
from models.dtos.material_dtos import ProcessPdfResponse, GenerateQuizResponse
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


@router.post("/upload", response_model=BaseResponse[ProcessPdfResponse])
async def upload_pdf(request: Request, file: UploadFile = File(...), service: MaterialService = Depends(get_material_service)) -> BaseResponse[ProcessPdfResponse]:
    user_context = extract_user_context(request)
    logger.info(f"Received file upload request: {file.filename}")
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")
    
    if not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Rejected non-PDF file: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

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
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz", response_model=BaseResponse[GenerateQuizResponse])
async def generate_quiz(
    request: Request,
    body: GenerateQuizRequest = Body(...),
    service: MaterialService = Depends(get_material_service)
) -> BaseResponse[GenerateQuizResponse]:
    user_context = extract_user_context(request)
    logger.info(f"Received quiz generation request. Selected types: {body.selected_types}")
    try:
        result = await service.generate_quiz(
            body.selected_types,
            user_context=user_context,
            target_language=body.target_language,
        )

        logger.info("Quiz generated successfully.")
        return BaseResponse[GenerateQuizResponse](success=True, payload=result)
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
