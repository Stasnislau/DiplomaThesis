import httpx
import logging
import os
from fastapi import APIRouter, Query, Request
from services.learning_path_service import LearningPathService
from models.dtos.learning_path_dtos import LearningPathDto
from models.base_response import BaseResponse
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from utils.user_context import extract_user_context

logger = logging.getLogger(__name__)


class CompleteLessonRequest(BaseModel):
    lesson_id: str
    language: str
    level: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class BulkCompleteLevelRequest(BaseModel):
    user_level: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class LearningPathController:
    def __init__(self, learning_path_service: LearningPathService):
        self.router = APIRouter()
        self.learning_path_service = learning_path_service
        self.setup_routes()

    @staticmethod
    async def _notify_user_service(ctx, path: str, payload: dict) -> None:
        headers = ctx.to_forward_headers() if ctx else {}
        headers["x-internal-service-key"] = os.getenv(
            "INTERNAL_SERVICE_KEY", "supersecretbridgekey"
        )
        um_url = os.getenv("USER_MICROSERVICE_URL", "http://localhost:3004/api")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{um_url}{path}", json=payload, headers=headers
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("UserMicroservice %s failed: %s", path, exc)

    def setup_routes(self):
        @self.router.get("/learning-path", response_model=BaseResponse[LearningPathDto])
        async def get_learning_path(
            request: Request,
            language: str = Query(..., description="Language to learn (e.g., 'english', 'spanish')"),
            level: str = Query(..., description="Current user level (e.g., 'A1', 'B2')")
        ):
            ctx = extract_user_context(request)
            user_id = ctx.user_id if ctx else ""
            result = await self.learning_path_service.get_learning_path(language, level, user_id=user_id)
            return BaseResponse(success=True, payload=result, errors=None)

        @self.router.post("/learning-path/complete")
        async def complete_lesson(
            request: Request,
            body: CompleteLessonRequest,
        ):
            ctx = extract_user_context(request)
            user_id = ctx.user_id if ctx else ""

            result = await self.learning_path_service.complete_lesson(
                lesson_id=body.lesson_id,
                user_id=user_id,
            )

            await self._notify_user_service(
                ctx,
                "/achievements/progress",
                {"achievementName": "Bookworm", "incrementBy": 1},
            )
            await self._notify_user_service(ctx, "/me/activity", {"xpGained": 20})

            return BaseResponse(success=True, payload=result, errors=None)

        @self.router.post("/learning-path/bulk-complete")
        async def bulk_complete_levels(
            request: Request,
            body: BulkCompleteLevelRequest,
        ):
            ctx = extract_user_context(request)
            user_id = ctx.user_id if ctx else ""

            result = await self.learning_path_service.bulk_complete_levels(
                up_to_level=body.user_level,
                user_id=user_id,
            )

            level_order = ["A1", "A2", "B1", "B2", "C1", "C2"]
            if body.user_level in level_order and level_order.index(body.user_level) >= 2:
                await self._notify_user_service(
                    ctx,
                    "/achievements/progress",
                    {"achievementName": "Level Up", "incrementBy": 1},
                )

            return BaseResponse(success=True, payload=result, errors=None)

    def get_router(self) -> APIRouter:
        return self.router
