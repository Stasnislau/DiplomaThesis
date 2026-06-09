from typing import Literal, Optional, Union

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from services.writing_task_service import WritingTaskService
from services.user_service import UserService
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.essay_dto import EssayTask, EssayEvaluation
from models.dtos.material_dtos import QuizQuestion
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


class WritingResultRequest(BaseModel):
    language: str
    level: str
    flavour: Literal["multiple_choice", "fill_in_the_blank"] = (
        "fill_in_the_blank"
    )
    isCorrect: bool
    topic: Optional[str] = None
    targetedWeaknesses: list[str] = []
    questionPreview: Optional[str] = None
    model_config = {"populate_by_name": True}


class TypedTaskRequest(BaseModel):
    """Request a single Materials-style question of the chosen type
    for the /quiz route — same discriminated-union catalog the
    Materials surface uses, just standalone (no PDF context)."""

    language: str
    level: str
    taskType: Literal[
        "multiple_choice",
        "fill_in_the_blank",
        "true_false",
        "multi_select_mc",
        "matching",
        "cloze_passage",
        "open",
    ] = Field(default="multiple_choice")
    model_config = {"populate_by_name": True}


class EssayGenerateRequest(BaseModel):
    language: str
    level: str
    topic: Optional[str] = None
    keywords: Optional[list[str]] = None
    model_config = {"populate_by_name": True}


class EssayEvaluateRequest(BaseModel):
    language: str
    level: str
    topic: str
    essay: str
    wordCountTarget: int = Field(default=300)
    lessonId: Optional[str] = None
    model_config = {"populate_by_name": True}


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
                        weaknesses=weaknesses or None,
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
                        weaknesses=weaknesses or None,
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
            "/result",
            response_model=BaseResponse[bool],
        )
        async def log_writing_result(
            request: Request, body: WritingResultRequest
        ) -> BaseResponse[bool]:
            """Record the outcome of a writing task (any flavour) so
            the next /writing/adaptive call sees what was answered
            correctly vs not. Without this the adaptive loop is open —
            we send tasks but never learn whether the user actually
            beat them."""
            user_context = extract_user_context(request)
            from utils.language_codes import to_iso_language

            await self.user_service.log_task_history(
                user_context,
                {
                    "taskType": "writing",
                    "title": (
                        f"Writing practice ({body.language})"
                        if not body.targetedWeaknesses
                        else f"Adaptive practice ({body.language})"
                    ),
                    "score": 100 if body.isCorrect else 0,
                    "language": to_iso_language(body.language),
                    "metadata": {
                        "flavour": body.flavour,
                        "isCorrect": body.isCorrect,
                        "topic": body.topic,
                        "questionPreview": (body.questionPreview or "")[:160],
                        "adaptive": bool(body.targetedWeaknesses),
                        "targetedWeaknesses": body.targetedWeaknesses,
                    },
                },
            )
            return BaseResponse[bool](success=True, payload=True)

        @self.router.post(
            "/typed-task",
            response_model=BaseResponse[QuizQuestion],
            response_model_exclude_none=True,
        )
        async def generate_typed_task(
            request: Request, body: TypedTaskRequest
        ) -> BaseResponse[QuizQuestion]:
            """Generate ONE question of the requested Materials-style
            type (multi_select_mc, true_false, matching, cloze_passage,
            etc.) with no PDF context. Used by the Quiz route to
            surface the full type catalog beyond the legacy
            MC/FIB-only mix.

            Reuses MaterialService.generate_standalone_task — same
            Stage 2 + Stage 3 pipeline + dedup safeguards as Materials,
            so a quality fix in either path benefits both."""
            from services.material_service import MaterialService
            from services.vector_db_service import VectorDBService
            from services.ai_service import AI_Service
            from utils.error_codes import (
                AI_RESPONSE_PARSE_FAILED,
                raise_with_code,
            )

            user_context = extract_user_context(request)
            material_service = MaterialService(
                VectorDBService(), AI_Service()
            )
            history = await self.user_service.get_recent_history(
                user_context, limit=20
            )
            focus = WritingTaskService.derive_adaptive_focus(history)

            question = await material_service.generate_standalone_task(
                task_type=body.taskType,
                language=body.language,
                level=body.level,
                user_context=user_context,
                focus_keywords=focus["keywords"] or None,
                topic=focus["topic"],
            )
            if question is None:
                raise_with_code(
                    AI_RESPONSE_PARSE_FAILED,
                    500,
                    f"Could not generate a {body.taskType} task right now.",
                )
            return BaseResponse[QuizQuestion](success=True, payload=question)

        @self.router.post(
            "/essay/generate",
            response_model=BaseResponse[EssayTask],
            response_model_exclude_none=True,
        )
        async def generate_essay(
            request: Request, body: EssayGenerateRequest
        ) -> BaseResponse[EssayTask]:
            """Produce an essay PROMPT (topic + scaffolding) for the
            learner. The user then writes their essay client-side and
            posts it to /essay/evaluate to get a score."""
            user_context = extract_user_context(request)
            task = await self.writing_task_service.generate_essay_task(
                body.language,
                body.level,
                user_context=user_context,
                topic=body.topic,
                keywords=body.keywords,
            )
            return BaseResponse[EssayTask](success=True, payload=task)

        @self.router.post(
            "/essay/evaluate",
            response_model=BaseResponse[EssayEvaluation],
            response_model_exclude_none=True,
        )
        async def evaluate_essay(
            request: Request, body: EssayEvaluateRequest
        ) -> BaseResponse[EssayEvaluation]:
            """Grade a learner's essay 0-100 and log the outcome to
            history so adaptive logic can pick up writing weaknesses."""
            user_context = extract_user_context(request)
            from utils.language_codes import to_iso_language

            evaluation = await self.writing_task_service.evaluate_essay(
                body.language,
                body.level,
                topic=body.topic,
                essay=body.essay,
                word_count_target=body.wordCountTarget,
                user_context=user_context,
            )

            # Log to TaskHistoryEntry — same shape as other writing
            # results so the existing adaptive-focus deriver can read
            # the weaknesses field.
            await self.user_service.log_task_history(
                user_context,
                {
                    "taskType": "writing",
                    "title": f"Essay practice ({body.language})",
                    "score": evaluation.score,
                    "language": to_iso_language(body.language),
                    "metadata": {
                        "flavour": "essay",
                        "isCorrect": evaluation.passed,
                        "topic": body.topic[:200],
                        "lessonId": body.lessonId,
                        "wordCount": evaluation.word_count,
                        "wordCountTarget": evaluation.word_count_target,
                        "weaknesses": evaluation.weaknesses,
                    },
                },
            )

            return BaseResponse[EssayEvaluation](success=True, payload=evaluation)

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
