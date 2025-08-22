from fastapi import APIRouter, Request, status, HTTPException
from services.placement_service import Placement_Service
# from services.bielik_service import Bielik_Service
from constants.constants import AVAILABLE_LANGUAGES
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.base_response import BaseResponse
from models.dtos.evaluate_test_dto import EvaluateTestDto


class Placement_Controller:
    def __init__(self, placement_service: Placement_Service):
        self.placement_service = placement_service
        self.router = APIRouter()

    def get_router(self) -> APIRouter:
        @self.router.post(
            "/placement/task",
        )
        async def create_placement_task(request: Request) -> BaseResponse[MultipleChoiceTask | FillInTheBlankTask]:
            data = await request.json()

            language = data.get("language")
            previous_answer = data.get("previousAnswer")

            if not language:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Language is required"
                )
            if language.lower() not in [lang.lower() for lang in AVAILABLE_LANGUAGES]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Language {language} is not supported. Available languages: {', '.join(AVAILABLE_LANGUAGES)}"
                )

            task = await self.placement_service.generate_placement_task(language, previous_answer)
            print(task, "TASK")
            response = BaseResponse[MultipleChoiceTask | FillInTheBlankTask](success=True, payload=task)
            return response

        @self.router.post(
            "/placement/evaluate",
        )
        async def evaluate_placement_test(request: Request) -> BaseResponse[EvaluateTestDto]:
            data = await request.json()

            answers = data.get("answers")
            language = data.get("language")

            if not answers or not language:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=[
                        {"loc": ["body", "answers"], "msg": "Answers are required"},
                        {"loc": ["body", "language"], "msg": "Language is required"}
                    ]
                )

            result = await self.placement_service.evaluate_test_results(answers, language)
            response = BaseResponse[EvaluateTestDto](success=True, payload=result)
            return response

        return self.router
