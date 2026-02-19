import httpx
import os
from fastapi import APIRouter, Query, Request
from services.learning_path_service import LearningPathService
from models.dtos.learning_path_dtos import LearningPathDto
from models.base_response import BaseResponse
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from utils.user_context import extract_user_context


class CompleteLessonRequest(BaseModel):
    lesson_id: str
    language: str
    level: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class BulkCompleteLevelRequest(BaseModel):
    """Sent right after a placement test to auto-complete all lower levels."""
    user_level: str   # e.g. "B1" → marks A1+A2 as COMPLETED

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class LearningPathController:
    def __init__(self, learning_path_service: LearningPathService):
        self.router = APIRouter()
        self.learning_path_service = learning_path_service
        self.setup_routes()

    def setup_routes(self):
        @self.router.get("/learning-path", response_model=BaseResponse[LearningPathDto])
        async def get_learning_path(
            request: Request,
            language: str = Query(..., description="Language to learn (e.g., 'english', 'spanish')"),
            level: str = Query(..., description="Current user level (e.g., 'A1', 'B2')")
        ):
            """Get the learning path for a specific language and user level."""
            ctx = extract_user_context(request)
            user_id = ctx.user_id if ctx else ""
            result = self.learning_path_service.get_learning_path(language, level, user_id=user_id)
            return BaseResponse(success=True, payload=result, errors=None)

        @self.router.post("/learning-path/complete")
        async def complete_lesson(
            request: Request,
            body: CompleteLessonRequest,
        ):
            """
            Mark a lesson as completed.
            - Updates the in-memory completion store for this user.
            - Returns which lesson is now unlocked next (if any).
            - Also triggers achievement progress on the UserMicroservice via
              the 'Bookworm' (+1 task) achievement.
            """
            ctx = extract_user_context(request)
            user_id = ctx.user_id if ctx else ""

            result = self.learning_path_service.complete_lesson(
                lesson_id=body.lesson_id,
                user_id=user_id,
            )

            # Trigger achievement via UserMicroservice (fire-and-forget, don't block)
            try:
                forward_headers = ctx.to_forward_headers() if ctx else {}
                forward_headers["x-internal-service-key"] = os.getenv(
                    "INTERNAL_SERVICE_KEY", "supersecretbridgekey"
                )
                um_url = os.getenv("USER_MICROSERVICE_URL", "http://localhost:3004/api")
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(
                        f"{um_url}/achievements/progress",
                        json={"achievementName": "Bookworm", "incrementBy": 1},
                        headers=forward_headers,
                    )
            except Exception:
                pass  # Achievement update failing must not break lesson completion

            return BaseResponse(success=True, payload=result, errors=None)

        @self.router.post("/learning-path/bulk-complete")
        async def bulk_complete_levels(
            request: Request,
            body: BulkCompleteLevelRequest,
        ):
            """
            Called after placement test.
            Marks every lesson in all CEFR levels below user_level as COMPLETED.
            e.g. user_level=B1 → A1 + A2 all done.
            """
            ctx = extract_user_context(request)
            user_id = ctx.user_id if ctx else ""

            result = self.learning_path_service.bulk_complete_levels(
                up_to_level=body.user_level,
                user_id=user_id,
            )

            # If level >= B1 also award the "Level Up" achievement
            level_order = ["A1", "A2", "B1", "B2", "C1", "C2"]
            if body.user_level in level_order and level_order.index(body.user_level) >= 2:
                try:
                    forward_headers = ctx.to_forward_headers() if ctx else {}
                    forward_headers["x-internal-service-key"] = os.getenv(
                        "INTERNAL_SERVICE_KEY", "supersecretbridgekey"
                    )
                    um_url = os.getenv("USER_MICROSERVICE_URL", "http://localhost:3004/api")
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        await client.post(
                            f"{um_url}/achievements/progress",
                            json={"achievementName": "Level Up", "incrementBy": 1},
                            headers=forward_headers,
                        )
                except Exception:
                    pass

            return BaseResponse(success=True, payload=result, errors=None)

    def get_router(self) -> APIRouter:
        return self.router
