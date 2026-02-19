from fastapi import APIRouter, Request
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.base_response import BaseResponse
from models.responses.listening_task_response import ListeningTaskResponse
from services.listening_task_service import ListeningTaskService
from utils.user_context import extract_user_context


class ListeningController:
    def __init__(self, listening_task_service: ListeningTaskService) -> None:
        self.router = APIRouter(prefix="/tasks", tags=["Listening"])
        self.listening_task_service = listening_task_service
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

    def get_router(self) -> APIRouter:
        return self.router
