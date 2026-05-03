from fastapi import APIRouter, Request, status, HTTPException
from services.placement_service import PlacementService
from constants.constants import AVAILABLE_LANGUAGES
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.base_response import BaseResponse
from models.dtos.evaluate_test_dto import EvaluateTestDto
from models.dtos.placement_dtos import PlacementAnswer, PlacementTestAnswer
from utils.user_context import extract_user_context


from models.request.placement_task_request import PlacementTaskRequest
from models.request.evaluate_placement_test_request import EvaluatePlacementTestRequest


class PlacementController:
    def __init__(self, placement_service: PlacementService) -> None:
        self.router = APIRouter(prefix="/placement", tags=["Placement"])
        self.placement_service = placement_service
        self._setup_routes()

    def _setup_routes(self) -> None:
        @self.router.post(
            "/task",
            response_model=BaseResponse[MultipleChoiceTask | FillInTheBlankTask],
        )
        async def create_placement_task(
            request: Request,
            task_request: PlacementTaskRequest
        ) -> BaseResponse[MultipleChoiceTask | FillInTheBlankTask]:
            user_context = extract_user_context(request)
            language = task_request.language

            from utils.error_codes import (
                INPUT_VALIDATION_FAILED,
                PLACEMENT_GENERATION_FAILED,
                raise_with_code,
            )
            if language.lower() not in [lang.lower() for lang in AVAILABLE_LANGUAGES]:
                raise_with_code(
                    INPUT_VALIDATION_FAILED,
                    status.HTTP_400_BAD_REQUEST,
                    f"Language {language} is not supported. Available: {', '.join(AVAILABLE_LANGUAGES)}",
                )

            try:
                task = await self.placement_service.generate_placement_task(
                    language=language,
                    previous_answer=task_request.previous_answer,
                    user_context=user_context,
                )
                return BaseResponse(payload=task)
            except HTTPException:
                raise
            except Exception as e:
                raise_with_code(PLACEMENT_GENERATION_FAILED, 500, str(e))

        @self.router.post(
            "/evaluate",
            response_model=BaseResponse[EvaluateTestDto],
        )
        async def evaluate_placement_test(
            request: Request,
            eval_request: EvaluatePlacementTestRequest
        ) -> BaseResponse[EvaluateTestDto]:
            user_context = extract_user_context(request)
            language = eval_request.language

            from utils.error_codes import (
                INPUT_VALIDATION_FAILED,
                PLACEMENT_EVALUATION_FAILED,
                raise_with_code,
            )
            if language.lower() not in [lang.lower() for lang in AVAILABLE_LANGUAGES]:
                raise_with_code(
                    INPUT_VALIDATION_FAILED,
                    status.HTTP_400_BAD_REQUEST,
                    f"Language {language} is not supported. Available: {', '.join(AVAILABLE_LANGUAGES)}",
                )

            try:
                result = await self.placement_service.evaluate_test_results(
                    answers=eval_request.answers,
                    language=language,
                    user_context=user_context
                )
                return BaseResponse(payload=result)
            except HTTPException:
                raise
            except Exception as e:
                raise_with_code(PLACEMENT_EVALUATION_FAILED, 500, str(e))

    def get_router(self) -> APIRouter:
        return self.router
