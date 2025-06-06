from fastapi import APIRouter, File, UploadFile, Query
from services.speaking_service import Speaking_Service
from models.base_response import BaseResponse


class Speaking_Controller:
    def __init__(self, speaking_service: Speaking_Service):
        self.speaking_service = speaking_service
        self.router = APIRouter()

    def get_router(self) -> APIRouter:
        @self.router.post("/speaking/analyze")
        async def analyze_user_audio(audio_file: UploadFile = File(...), language: str = Query(...)) -> BaseResponse[str]:
            audio_bytes = await audio_file.read()
            print(f"Controller received audio file: {audio_file.filename}, size: {len(audio_bytes)} bytes")
            result = await self.speaking_service.analyze_user_audio(audio_bytes, audio_file.filename, language)
            return BaseResponse[str](success=True, payload=result)

        return self.router
