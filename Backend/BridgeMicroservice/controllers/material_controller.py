from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body
from services.material_service import MaterialService
from services.vector_db_service import VectorDBService
from services.ai_service import AI_Service
from pydantic import BaseModel
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/materials", tags=["materials"])


# Dependency Injection
def get_material_service() -> MaterialService:
    vector_db = VectorDBService()
    ai_service = AI_Service()
    return MaterialService(vector_db, ai_service)


class GenerateQuizRequest(BaseModel):
    selected_types: Optional[List[str]] = None


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), service: MaterialService = Depends(get_material_service)) -> Dict[str, Any]:
    logger.info(f"Received file upload request: {file.filename}")
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")
    
    if not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Rejected non-PDF file: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        content = await file.read()
        logger.info(f"File read successfully, size: {len(content)} bytes. Starting processing...")
        result = await service.process_pdf(content, file.filename)
        logger.info("PDF processed successfully.")
        return {
            "success": True,
            "payload": result
        }
    except Exception as e:
        logger.error(f"Error uploading/processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz")
async def generate_quiz(
    request: GenerateQuizRequest = Body(...),
    service: MaterialService = Depends(get_material_service)
) -> Dict[str, Any]:
    logger.info(f"Received quiz generation request. Selected types: {request.selected_types}")
    try:
        result = await service.generate_quiz(request.selected_types)
        
        # Parse inner JSON if stringified
        if isinstance(result.get("quiz"), str):
            try:
                result["quiz"] = json.loads(result["quiz"])
            except:
                pass
        
        logger.info("Quiz generated successfully.")
        return {
            "success": True,
            "payload": result
        }
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
