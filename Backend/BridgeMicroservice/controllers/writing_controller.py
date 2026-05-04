from typing import Literal, Optional, Union

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from services.writing_task_service import WritingTaskService
from services.user_service import UserService
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.request.explain_answer_request import ExplainAnswerRequest
from models.responses.explain_answer_response import ExplainAnswerResponse
from models.request.writing_task_request import WritingTaskRequest
from models.base_response import BaseResponse
from utils.user_context import extract_user_context


class AdaptiveWritingRequest(BaseModel):
    language: str
    level: str
    flavour: Literal["multiple_choice", "fill_in_the_blank"] = Field(
        default="fill_in_the_blank",
        description="Which task shape to generate.",
    )
    model_config = {"populate_by_name": True}


class AdaptiveWritingResponse(BaseModel):
    task: Union[MultipleChoiceTask, FillInTheBlankTask]
    targetedWeaknesses: list[str] = []
    derivedFromHistory: bool = False


class WritingController:
    def __init__(
        self,
        writing_task_service: WritingTaskService,
        user_service: UserService,
    ) -> None:
        self.router = APIRouter(prefix="/writing", tags=["Writing"])
        self.writing_task_service = writing_task_service
        self.user_service = user_service
        self._setup_routes()

    def _setup_routes(self) -> None:
        @self.router.post(
            "/multiplechoice",
            response_model=BaseResponse[MultipleChoiceTask],
        )
        async def generate_writing_multiple_choice_task(
            request: Request, task_request: WritingTaskRequest
        ) -> BaseResponse[MultipleChoiceTask]:
            user_context = extract_user_context(request)
            task: MultipleChoiceTask = await self.writing_task_service.generate_writing_multiple_choice_task(
                task_request.language, task_request.level,
                user_context=user_context,
                topic=task_request.topic,
                keywords=task_request.keywords,
            )
            return BaseResponse[MultipleChoiceTask](success=True, payload=task)

        @self.router.post(
            "/blank",
            response_model=BaseResponse[FillInTheBlankTask],
            response_model_exclude_none=True
        )
        async def create_blank_task(
            request: Request, task_request: WritingTaskRequest
        ) -> BaseResponse[FillInTheBlankTask]:
            user_context = extract_user_context(request)
            task: FillInTheBlankTask = await self.writing_task_service.generate_writing_fill_in_the_blank_task(
                task_request.language, task_request.level,
                user_context=user_context,
                topic=task_request.topic,
                keywords=task_request.keywords,
            )
            return BaseResponse[FillInTheBlankTask](success=True, payload=task)

        @self.router.post(
            "/adaptive",
            response_model=BaseResponse[AdaptiveWritingResponse],
            response_model_exclude_none=True,
        )
        async def generate_adaptive_task(
            request: Request, body: AdaptiveWritingRequest
        ) -> BaseResponse[AdaptiveWritingResponse]:
            """Generate a writing task biased toward the user's recent
            weaknesses (placement misses, low-score topics, frequent
            speaking errors). Falls back to the regular generator
            when there's no history to learn from."""
            user_context = extract_user_context(request)
            history = await self.user_service.get_recent_history(
                user_context, limit=20
            )
            focus = WritingTaskService.derive_adaptive_focus(history)
            topic: Optional[str] = focus["topic"]
            keywords: list[str] = focus["keywords"]
            weaknesses: list[str] = focus["weaknesses"]
            derived = bool(weaknesses or keywords or topic)

            if body.flavour == "multiple_choice":
                task: Union[MultipleChoiceTask, FillInTheBlankTask] = (
                    await self.writing_task_service
                    .generate_writing_multiple_choice_task(
                        body.language, body.level,
                        user_context=user_context,
                        topic=topic,
                        keywords=keywords or None,
                    )
                )
            else:
                task = (
                    await self.writing_task_service
                    .generate_writing_fill_in_the_blank_task(
                        body.language, body.level,
                        user_context=user_context,
                        topic=topic,
                        keywords=keywords or None,
                    )
                )

            # Best-effort log so the next call can see what we already
            # targeted and avoid repeating the same exact weakness.
            await self.user_service.log_task_history(
                user_context,
                {
                    "taskType": "writing",
                    "title": (
                        f"Adaptive practice ({body.language})"
                    ),
                    "score": None,
                    "language": body.language,
                    "metadata": {
                        "adaptive": True,
                        "flavour": body.flavour,
                        "topic": topic,
                        "targetedWeaknesses": weaknesses,
                        "historyEntries": len(history),
                    },
                },
            )

            return BaseResponse[AdaptiveWritingResponse](
                success=True,
                payload=AdaptiveWritingResponse(
                    task=task,
                    targetedWeaknesses=weaknesses,
                    derivedFromHistory=derived,
                ),
            )

        @self.router.post(
            "/explainanswer",
            response_model=BaseResponse[ExplainAnswerResponse],
            response_model_exclude_none=True
        )
        async def explain_answer(
            request: Request, explain_request: ExplainAnswerRequest
        ) -> BaseResponse[ExplainAnswerResponse]:
            user_context = extract_user_context(request)
            result: ExplainAnswerResponse = await self.writing_task_service.explain_answer(
                explain_request, user_context=user_context
            )

            response = BaseResponse[ExplainAnswerResponse](success=True, payload=result)
            return response

    def get_router(self) -> APIRouter:
        return self.router
