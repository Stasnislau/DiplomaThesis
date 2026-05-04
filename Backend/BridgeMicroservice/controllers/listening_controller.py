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
            return BaseResponse[AdaptiveListeningResponse](
                success=True,
                payload=AdaptiveListeningResponse(
                    task=task,
                    targetedWeaknesses=weaknesses,
                    derivedFromHistory=bool(weaknesses or keywords or topic),
                ),
            )

    def get_router(self) -> APIRouter:
        return self.router
