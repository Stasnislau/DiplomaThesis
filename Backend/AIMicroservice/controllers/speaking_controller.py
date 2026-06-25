from pydantic import BaseModel

from fastapi import APIRouter, File, UploadFile, Query, Request
from services.speaking_service import SpeakingService
from services.tts_service import TTSService
from services.user_service import UserService
from services.writing_task_service import WritingTaskService
from models.base_response import BaseResponse
from models.responses.speaking_analysis_response import SpeakingAnalysisResponse
from models.responses.speaking_format_response import (
    SpeakingPromptRequest,
    SpeakingPromptResponse,
    SpeakingGradeResponse,
    is_known_format,
)
from utils.user_context import extract_user_context
import logging

logger = logging.getLogger("ai_microservice")


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


# Singleton TTSService — read_after_me uses it. Safe to share: no
# per-call mutable state, just an authenticated client wrapper.
_tts_service: TTSService | None = None


def _get_tts_service() -> TTSService:
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service


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

            # FR6 — persist each identified error to the user's recurring
            # error log (upsert on the User side). Best-effort: a failure
            # here must not break the analysis the user is waiting on.
            from utils.language_codes import to_iso_language

            language_code = to_iso_language(language)
            if language_code:
                for err in result.identified_errors:
                    await self.user_service.record_user_error(
                        user_context,
                        {
                            "languageCode": language_code,
                            "errorText": err.erroneous_text,
                            "correction": err.suggestion,
                            "errorType": err.error_type,
                            "source": "speaking",
                            "context": err.explanation,
                        },
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

        @self.router.post(
            "/practice-prompt",
            response_model=BaseResponse[SpeakingPromptResponse],
        )
        async def generate_speaking_prompt(
            request: Request, body: SpeakingPromptRequest
        ) -> BaseResponse[SpeakingPromptResponse]:
            """Phase 3 — format-driven prompt generation. Returns the
            text/audio the FE should display before the user records."""
            user_context = extract_user_context(request)
            history = await self.user_service.get_recent_history(
                user_context, limit=20
            )
            focus = WritingTaskService.derive_adaptive_focus(history)

            # repeat_after_me wants TTS audio of the target phrase.
            # Inject the synthesizer as a callable so the service stays
            # decoupled and mockable.
            tts = _get_tts_service()
            tts_callable = tts.synthesize if body.format == "repeat_after_me" else None

            result = await self.speaking_service.generate_speaking_prompt(
                language=body.language,
                level=body.level,
                format=body.format,
                user_context=user_context,
                focus_keywords=focus["keywords"] or None,
                focus_weaknesses=focus["weaknesses"] or None,
                tts_synthesizer=tts_callable,
            )
            # Surface adaptive provenance to the FE so it can show the
            # "targeting from history" hint.
            result.targetedWeaknesses = focus["weaknesses"]
            result.derivedFromHistory = bool(
                focus["weaknesses"] or focus["keywords"] or focus["topic"]
            )
            return BaseResponse[SpeakingPromptResponse](
                success=True, payload=result
            )

        @self.router.post(
            "/grade-response",
            response_model=BaseResponse[SpeakingGradeResponse],
        )
        async def grade_speaking_response(
            request: Request,
            audio_file: UploadFile = File(...),
            language: str = Query(...),
            format: str = Query(..., description="Speaking format the response was for."),
            prompt_text: str = Query(..., alias="promptText"),
            target_phrase: str | None = Query(None, alias="targetPhrase"),
            ui_locale: str = Query("en", alias="uiLocale"),
        ) -> BaseResponse[SpeakingGradeResponse]:
            """Phase 3 — grade a recorded response against a known
            prompt. Defers to Whisper for transcription, then uses
            either word-error-rate (repeat_after_me) or LLM-rubric
            grading (everything else)."""
            if not is_known_format(format):
                from utils.error_codes import (
                    AI_RESPONSE_PARSE_FAILED,
                    raise_with_code,
                )

                raise_with_code(
                    AI_RESPONSE_PARSE_FAILED,
                    400,
                    f"Unknown speaking format: {format}",
                )
            audio_bytes = await audio_file.read()
            user_context = extract_user_context(request)
            result = await self.speaking_service.grade_speaking_response(
                audio_file_bytes=audio_bytes,
                filename=audio_file.filename,
                language=language,
                format=format,
                prompt_text=prompt_text,
                target_phrase=target_phrase,
                user_context=user_context,
                ui_locale=ui_locale,
            )
            return BaseResponse[SpeakingGradeResponse](
                success=True, payload=result
            )

    def get_router(self) -> APIRouter:
        return self.router
