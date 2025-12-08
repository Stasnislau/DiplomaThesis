from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from services.material_service import MaterialService
from services.vector_db_service import VectorDBService
from services.ai_service import AI_Service
from pydantic import BaseModel
import json
from utils.user_context import extract_user_context

router = APIRouter(prefix="/materials", tags=["materials"])


# Dependency Injection
def get_material_service() -> MaterialService:
    vector_db = VectorDBService()
    ai_service = AI_Service()
    return MaterialService(vector_db, ai_service)


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), service: MaterialService = Depends(get_material_service)) -> Dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        content = await file.read()
        result = await service.process_pdf(content, file.filename)
        return {
            "success": True,
            "payload": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz")
async def generate_quiz(
    request: Request, service: MaterialService = Depends(get_material_service)
) -> Dict[str, Any]:
    try:
        user_context = extract_user_context(request)
        result = await service.generate_quiz(user_context=user_context)
        
        # Parse inner JSON if stringified
        if isinstance(result.get("quiz"), str):
            try:
                result["quiz"] = json.loads(result["quiz"])
            except:
                pass
                
        return {
            "success": True,
            "payload": result
        }
    except Exception as e:
        print(f"Error in generate_quiz endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
