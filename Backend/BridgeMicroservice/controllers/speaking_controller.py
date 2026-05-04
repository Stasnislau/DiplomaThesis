from pydantic import BaseModel

from fastapi import APIRouter, File, UploadFile, Query, Request
from services.speaking_service import SpeakingService
from services.user_service import UserService
from services.writing_task_service import WritingTaskService
from models.base_response import BaseResponse
from models.responses.speaking_analysis_response import SpeakingAnalysisResponse
from utils.user_context import extract_user_context
import logging

logger = logging.getLogger("bridge_microservice")


class PracticePhraseRequest(BaseModel):
    language: str
    level: str
    model_config = {"populate_by_name": True}


class PracticePhraseResponse(BaseModel):
    phrase: str
    focus: str = ""
    translation: str = ""
    targetedWeaknesses: list[str] = []
    derivedFromHistory: bool = False


class SpeakingController:
    def __init__(
        self,
        speaking_service: SpeakingService,
        user_service: UserService,
    ) -> None:
        self.router = APIRouter(prefix="/speaking", tags=["Speaking"])
        self.speaking_service = speaking_service
        self.user_service = user_service
        self._setup_routes()

    def _setup_routes(self) -> None:
        @self.router.post(
            "/analyze",
            response_model=BaseResponse[SpeakingAnalysisResponse],
        )
        async def analyze_user_audio(
            request: Request,
            audio_file: UploadFile = File(...),
            language: str = Query(...),
            ui_locale: str = Query("en", alias="uiLocale"),
        ) -> BaseResponse[SpeakingAnalysisResponse]:
            audio_bytes = await audio_file.read()
            logger.debug(f"Received audio file: {audio_file.filename}, size: {len(audio_bytes)} bytes")
            user_context = extract_user_context(request)
            result = await self.speaking_service.analyze_user_audio(
                audio_bytes,
                audio_file.filename,
                language,
                user_context=user_context,
                ui_locale=ui_locale,
            )
            return BaseResponse(success=True, payload=result)

        @self.router.post(
            "/practice-phrase",
            response_model=BaseResponse[PracticePhraseResponse],
        )
        async def get_practice_phrase(
            request: Request, body: PracticePhraseRequest
        ) -> BaseResponse[PracticePhraseResponse]:
            """Generate one sentence for the user to read aloud,
            biased toward their recent speaking weaknesses. Pair with
            POST /speaking/analyze to score the recording."""
            user_context = extract_user_context(request)
            history = await self.user_service.get_recent_history(
                user_context, limit=20
            )
            focus = WritingTaskService.derive_adaptive_focus(history)
            result = await self.speaking_service.generate_practice_phrase(
                language=body.language,
                level=body.level,
                user_context=user_context,
                focus_keywords=focus["keywords"] or None,
                focus_weaknesses=focus["weaknesses"] or None,
            )
            return BaseResponse[PracticePhraseResponse](
                success=True,
                payload=PracticePhraseResponse(
                    phrase=result["phrase"],
                    focus=result["focus"],
                    translation=result["translation"],
                    targetedWeaknesses=focus["weaknesses"],
                    derivedFromHistory=bool(
                        focus["weaknesses"] or focus["keywords"] or focus["topic"]
                    ),
                ),
            )

    def get_router(self) -> APIRouter:
        return self.router
