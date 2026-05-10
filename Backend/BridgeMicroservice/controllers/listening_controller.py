from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter, Request
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.base_response import BaseResponse
from models.responses.listening_task_response import ListeningTaskResponse
from services.listening_task_service import ListeningTaskService
from services.user_service import UserService
from services.writing_task_service import WritingTaskService
from utils.user_context import extract_user_context


class AdaptiveListeningResponse(BaseModel):
    task: ListeningTaskResponse
    targetedWeaknesses: list[str] = []
    derivedFromHistory: bool = False


class ListeningErrorExample(BaseModel):
    """One wrong-answer trace from a finished listening task. The
    `type` is the question subtype (e.g. "fill_in_the_blank"), `text`
    is a 160-char preview of the question, `suggestion` is the
    canonical correct answer. Fed to derive_adaptive_focus so the
    next task can drill the same kind of miss."""

    type: Optional[str] = None
    text: Optional[str] = None
    suggestion: Optional[str] = None


class ListeningResultRequest(BaseModel):
    language: str
    level: str
    # 0-100. Computed FE-side from correct/total.
    score: int
    questionCount: int
    correctCount: int
    questionTypes: list[str] = []
    errorExamples: list[ListeningErrorExample] = []
    targetedWeaknesses: list[str] = []
    model_config = {"populate_by_name": True}


class ListeningController:
    def __init__(
        self,
        listening_task_service: ListeningTaskService,
        user_service: UserService,
    ) -> None:
        self.router = APIRouter(prefix="/tasks", tags=["Listening"])
        self.listening_task_service = listening_task_service
        self.user_service = user_service
        self._setup_routes()

    def _setup_routes(self) -> None:
        @self.router.post(
            "/listening",
            response_model=BaseResponse[ListeningTaskResponse],
        )
        async def create_listening_task(
            request: Request, task_request: ListeningTaskRequest
        ) -> BaseResponse[ListeningTaskResponse]:
            user_context = extract_user_context(request)
            task_response = await self.listening_task_service.create_listening_task(
                task_request, user_context=user_context
            )
            return BaseResponse[ListeningTaskResponse](success=True, payload=task_response)

        @self.router.post(
            "/listening/adaptive",
            response_model=BaseResponse[AdaptiveListeningResponse],
        )
        async def create_adaptive_listening_task(
            request: Request, task_request: ListeningTaskRequest
        ) -> BaseResponse[AdaptiveListeningResponse]:
            """Listening passage biased toward the user's recent
            weaknesses — the same focus extractor as /writing/adaptive,
            but the keywords get woven into the audio passage so the
            user listens to vocabulary they just got wrong."""
            user_context = extract_user_context(request)
            history = await self.user_service.get_recent_history(
                user_context, limit=20
            )
            focus = WritingTaskService.derive_adaptive_focus(history)
            topic = focus["topic"]
            keywords = focus["keywords"]
            weaknesses = focus["weaknesses"]
            task = await self.listening_task_service.create_listening_task(
                task_request,
                user_context=user_context,
                focus_topic=topic,
                focus_keywords=keywords or None,
            )
            # `question_types` rides on the inbound ListeningTaskRequest
            # already; the service reads it from there. No extra
            # plumbing needed here.
            return BaseResponse[AdaptiveListeningResponse](
                success=True,
                payload=AdaptiveListeningResponse(
                    task=task,
                    targetedWeaknesses=weaknesses,
                    derivedFromHistory=bool(weaknesses or keywords or topic),
                ),
            )

        @self.router.post(
            "/listening/result",
            response_model=BaseResponse[bool],
        )
        async def log_listening_result(
            request: Request, body: ListeningResultRequest
        ) -> BaseResponse[bool]:
            """Persist the outcome of a finished listening practice
            session so /tasks/listening/adaptive (and the speaking /
            writing adaptive paths) can read what the user struggled
            with. Until this existed, listening results were a black
            hole — the platform generated tasks but never learned from
            misses, so the adaptive loop was effectively writing-only."""
            from utils.language_codes import to_iso_language

            user_context = extract_user_context(request)
            await self.user_service.log_task_history(
                user_context,
                {
                    "taskType": "listening",
                    "title": f"Listening practice ({body.language})",
                    "score": body.score,
                    "language": to_iso_language(body.language),
                    "metadata": {
                        # Top-level adaptive signals — derive_adaptive_focus
                        # reads these blindly across all task types.
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
                            ["listening comprehension"]
                            if body.score < 60
                            else []
                        ),
                        "targetedWeaknesses": body.targetedWeaknesses,
                        # Bookkeeping for later analytics dashboards.
                        "questionCount": body.questionCount,
                        "correctCount": body.correctCount,
                        "questionTypes": body.questionTypes,
                        "adaptive": bool(body.targetedWeaknesses),
                    },
                },
            )
            return BaseResponse[bool](success=True, payload=True)

    def get_router(self) -> APIRouter:
        return self.router
