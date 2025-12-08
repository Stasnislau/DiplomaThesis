from fastapi import APIRouter, Request
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.responses.listening_task_response import ListeningTaskResponse
from services.listening_task_service import Listening_Task_Service
from utils.user_context import extract_user_context


class Listening_Controller:
    def __init__(self, listening_task_service: Listening_Task_Service) -> None:
        self._router = APIRouter(prefix="/tasks", tags=["Tasks"])
        self._listening_task_service = listening_task_service

        @self._router.post("/listening", response_model=ListeningTaskResponse)
        async def create_listening_task(
            request: Request, payload: ListeningTaskRequest
        ) -> ListeningTaskResponse:
            user_context = extract_user_context(request)
            return await self._listening_task_service.create_listening_task(
                payload, user_context=user_context
            )

    def get_router(self) -> APIRouter:
        return self._router
