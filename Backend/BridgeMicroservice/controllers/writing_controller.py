from fastapi import APIRouter
from services.writing_task_service import Writing_Task_Service
# from services.bielik_service import Bielik_Service
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.request.explain_answer_request import ExplainAnswerRequest
from models.responses.explain_answer_response import ExplainAnswerResponse
from models.request.writing_task_request import WritingTaskRequest
from models.base_response import BaseResponse


class Writing_Controller:
    def __init__(self, writing_task_service: Writing_Task_Service):
        self.writing_task_service = writing_task_service
        # self.bielik_service = bielik_service
        self.router = APIRouter()

    def get_router(self) -> APIRouter:
        @self.router.post(
            "/writing/multiplechoice",
            response_model=BaseResponse[MultipleChoiceTask],
        )
        async def generate_writing_multiple_choice_task(task_request: WritingTaskRequest) -> BaseResponse[MultipleChoiceTask]:
            task: MultipleChoiceTask = await self.writing_task_service.generate_writing_multiple_choice_task(
                task_request.language, task_request.level
            )
            response = BaseResponse[MultipleChoiceTask](success=True, payload=task)
            print(response.model_dump_json())
            return response

        @self.router.post(
            "/writing/blank",
            response_model=BaseResponse[FillInTheBlankTask],
            response_model_exclude_none=True
        )
        async def create_blank_task(task_request: WritingTaskRequest) -> BaseResponse[FillInTheBlankTask]:
            task: FillInTheBlankTask = await self.writing_task_service.generate_writing_fill_in_the_blank_task(
                task_request.language, task_request.level
            )
            response = BaseResponse[FillInTheBlankTask](success=True, payload=task)
            print(response.model_dump_json())
            return response

        @self.router.post(
            "/writing/explainanswer",
            response_model=BaseResponse[ExplainAnswerResponse],
            response_model_exclude_none=True
        )
        async def explain_answer(explain_request: ExplainAnswerRequest) -> BaseResponse[ExplainAnswerResponse]:
            result: ExplainAnswerResponse = await self.writing_task_service.explain_answer(explain_request)

            response = BaseResponse[ExplainAnswerResponse](success=True, payload=result)
            return response

        return self.router
