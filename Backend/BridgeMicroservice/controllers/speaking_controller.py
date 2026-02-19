from fastapi import APIRouter, File, UploadFile, Query, Request
from services.speaking_service import SpeakingService
from models.base_response import BaseResponse
from models.responses.speaking_analysis_response import SpeakingAnalysisResponse
from utils.user_context import extract_user_context
import logging

logger = logging.getLogger("bridge_microservice")


class SpeakingController:
    def __init__(self, speaking_service: SpeakingService) -> None:
        self.router = APIRouter(prefix="/speaking", tags=["Speaking"])
        self.speaking_service = speaking_service
        self._setup_routes()

    def _setup_routes(self) -> None:
        @self.router.post(
            "/analyze",
            response_model=BaseResponse[SpeakingAnalysisResponse],
        )
        async def analyze_user_audio(
            request: Request, audio_file: UploadFile = File(...), language: str = Query(...)
        ) -> BaseResponse[SpeakingAnalysisResponse]:
            audio_bytes = await audio_file.read()
            logger.debug(f"Received audio file: {audio_file.filename}, size: {len(audio_bytes)} bytes")
            user_context = extract_user_context(request)
            result = await self.speaking_service.analyze_user_audio(
                audio_bytes, audio_file.filename, language, user_context=user_context
            )
            return BaseResponse(success=True, payload=result)

    def get_router(self) -> APIRouter:
        return self.router
