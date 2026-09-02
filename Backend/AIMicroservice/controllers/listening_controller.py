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
from utils.language_codes import to_iso_language


class AdaptiveListeningResponse(BaseModel):
    task: ListeningTaskResponse
    targetedWeaknesses: list[str] = []
    derivedFromHistory: bool = False


class ListeningErrorExample(BaseModel):

    type: Optional[str] = None
    text: Optional[str] = None
    suggestion: Optional[str] = None


class ListeningResultRequest(BaseModel):
    language: str
    level: str
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
            user_context = extract_user_context(request)
            history = await self.user_service.get_recent_history(
                user_context, limit=20
            )
            recurring = []
            language_code = to_iso_language(task_request.language)
            if language_code:
                recurring = await self.user_service.get_recurring_errors(
                    user_context, language_code
                )
            focus = WritingTaskService.derive_adaptive_focus(history, recurring)
            topic = focus["topic"]
            keywords = focus["keywords"]
            weaknesses = focus["weaknesses"]
            task = await self.listening_task_service.create_listening_task(
                task_request,
                user_context=user_context,
                focus_topic=topic,
                focus_keywords=keywords or None,
                focus_weaknesses=weaknesses or None,
            )
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

            user_context = extract_user_context(request)
            await self.user_service.log_task_history(
                user_context,
                {
                    "taskType": "listening",
                    "title": f"Listening practice ({body.language})",
                    "score": body.score,
                    "language": to_iso_language(body.language),
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
                            ["listening comprehension"]
                            if body.score < 60
                            else []
                        ),
                        "targetedWeaknesses": body.targetedWeaknesses,
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
