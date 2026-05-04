import json
import uuid
import logging
from typing import Union, Any, Dict, Type, TypeVar, Optional
from services.vector_db_service import VectorDBService
from services.ai_service import AI_Service
from utils.user_context import UserContext
from dotenv import load_dotenv
from constants.prompts import writing_multiple_choice_task_prompt, writing_fill_in_the_blank_task_prompt, explain_answer_prompt
from constants.variety import variety_picker
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.vector_db_dtos import SpecificSkillContext, FullLevelContext
from models.request.explain_answer_request import ExplainAnswerRequest
from models.responses.explain_answer_response import ExplainAnswerResponse
from pipelines.verification_pipeline import VerificationPipeline
from models.dtos.verification_dtos import VerificationResult
from pydantic import BaseModel

load_dotenv()

logger = logging.getLogger("bridge_microservice")

TaskModelType = TypeVar("TaskModelType", bound=BaseModel)


class WritingTaskService:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service):
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service
        self.verification_pipeline = VerificationPipeline(ai_service)

    async def generate_writing_multiple_choice_task(
        self, language: str, level: str, user_context: Optional[UserContext] = None,
        topic: Optional[str] = None, keywords: Optional[list[str]] = None,
    ) -> MultipleChoiceTask:
        effective_level = "A1" if level.upper() == "A0" else level.upper()
        level_context: Union[SpecificSkillContext, FullLevelContext, None] = self.vector_db_service.get_level_context(
            effective_level, "writing"
        )
        if not level_context:
            raise ValueError(f"Invalid level: {effective_level}")

        if topic is None:
            session_key = user_context.user_id if user_context else "writing_mc_global"
            topic = variety_picker.pick_topic(effective_level, session_key=session_key)

        seed = str(uuid.uuid4())
        prompt = writing_multiple_choice_task_prompt(
            language, level, level_context.model_dump(),
            topic=topic, keywords=keywords, seed=seed,
            ui_locale_label=user_context.ui_locale_label if user_context else None,
        )
        response = await self.ai_service.get_ai_response(
            prompt, user_context=user_context, temperature=0.8
        )
        json_response = await self._process_ai_response_and_validate(response)
        logger.debug("Multiple choice task generated successfully")

        verification_result = VerificationResult(is_valid=True)

        try:
            if not verification_result.is_valid and verification_result.better_task:
                json_response = verification_result.better_task.model_dump(exclude_unset=True)
                logger.info("Using improved task from verification")
            elif not verification_result.is_valid:
                logger.warning(f"Task not valid: {verification_result.explanation}")

            return self._finalize_task_generation(json_response, "multiple_choice", MultipleChoiceTask)

        except Exception as e:
            logger.error(f"Error during task generation/verification: {e}")
            return self._finalize_task_generation(json_response, "multiple_choice", MultipleChoiceTask)

    async def generate_writing_fill_in_the_blank_task(
        self, language: str, level: str, user_context: Optional[UserContext] = None,
        topic: Optional[str] = None, keywords: Optional[list[str]] = None,
    ) -> FillInTheBlankTask:
        effective_level = "A1" if level.upper() == "A0" else level.upper()
        level_context: Union[SpecificSkillContext, FullLevelContext, None] = self.vector_db_service.get_level_context(
            effective_level, "writing"
        )

        if not level_context:
            raise ValueError(f"Invalid level: {effective_level}")

        if topic is None:
            session_key = user_context.user_id if user_context else "writing_fib_global"
            topic = variety_picker.pick_topic(effective_level, session_key=session_key)

        seed = str(uuid.uuid4())
        prompt = writing_fill_in_the_blank_task_prompt(
            language, level, level_context.model_dump(),
            topic=topic, keywords=keywords, seed=seed,
            ui_locale_label=user_context.ui_locale_label if user_context else None,
        )
        response = await self.ai_service.get_ai_response(
            prompt, user_context=user_context, temperature=0.8
        )
        json_response = await self._process_ai_response_and_validate(response, is_fill_in_blank=True)

        return self._finalize_task_generation(json_response, "fill_in_the_blank", FillInTheBlankTask)

    async def explain_answer(
        self,
        explain_answer_request: ExplainAnswerRequest,
        user_context: Optional[UserContext] = None,
    ) -> ExplainAnswerResponse:
        language = explain_answer_request.language
        level = explain_answer_request.level
        task = explain_answer_request.task
        correct_answer = explain_answer_request.correct_answer
        user_answer = explain_answer_request.user_answer
        prompt = explain_answer_prompt(
            language, level, task, correct_answer, user_answer,
            ui_locale_label=user_context.ui_locale_label if user_context else None,
        )
        response = await self.ai_service.get_ai_response(
            prompt, user_context=user_context
        )
        json_response = await self._process_ai_response_and_validate(response)

        return self._finalize_task_generation(
            json_response,
            "explain_answer_response",
            ExplainAnswerResponse,
        )

    @staticmethod
    def derive_adaptive_focus(
        history_entries: list[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Extract a (topic, keywords, weaknesses) focus from the user's
        recent history rows. Used by the /writing/adaptive endpoint to
        bias the next generated task toward what the user is actually
        struggling with.

        Heuristics:
          - Placement entries contribute their stored `weaknesses` claim
            from metadata (the AI's structured assessment).
          - Speaking entries with `errorCount >= 3` contribute the most
            common error categories from `metadata.errorTypes` (when
            present) and lower the topic level toward review.
          - Low-score writing/listening entries contribute their
            `metadata.topic` (if any) as a recurring topic to revisit.

        Returns a dict suitable for handing to the standard task
        generators: `{ topic: Optional[str], keywords: list[str],
        weaknesses: list[str] }`. Empty fields are fine — the caller
        falls back to the regular variety picker when nothing useful
        is extracted.
        """
        weaknesses: list[str] = []
        keywords: list[str] = []
        topics: list[str] = []
        for entry in history_entries:
            meta = entry.get("metadata") or {}
            if entry.get("taskType") == "placement":
                w = meta.get("weaknesses")
                if isinstance(w, list):
                    weaknesses.extend(str(x) for x in w if x)
                elif isinstance(w, str) and w.strip():
                    weaknesses.append(w.strip())
            score = entry.get("score")
            if isinstance(score, (int, float)) and score < 60:
                t = meta.get("topic")
                if isinstance(t, str) and t.strip():
                    topics.append(t.strip())
                # speaking errors come back as a count — when high,
                # we ask for "review" tasks.
                ecount = meta.get("errorCount")
                if isinstance(ecount, int) and ecount >= 3:
                    weaknesses.append("recent pronunciation issues")
        # Dedupe while preserving order so the latest few weaknesses
        # bubble first.
        def _dedupe(items: list[str]) -> list[str]:
            seen: set[str] = set()
            out: list[str] = []
            for x in items:
                k = x.lower()
                if k in seen:
                    continue
                seen.add(k)
                out.append(x)
            return out

        weaknesses = _dedupe(weaknesses)[:5]
        keywords = _dedupe(keywords + weaknesses)[:8]
        topic = topics[0] if topics else None
        return {
            "topic": topic,
            "keywords": keywords,
            "weaknesses": weaknesses,
        }

    async def _process_ai_response_and_validate(self, response_str: str, is_fill_in_blank: bool = False) -> Dict[str, Any]:
        from utils.error_codes import AI_RESPONSE_PARSE_FAILED, raise_with_code
        try:
            json_data = json.loads(response_str)
            return json_data  # type: ignore
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response JSON: {e}")
            raise_with_code(
                AI_RESPONSE_PARSE_FAILED,
                500,
                "Failed to parse AI response into expected JSON structure.",
            )
        except Exception as e:
            logger.error(f"Error processing AI response: {e}")
            raise_with_code(
                AI_RESPONSE_PARSE_FAILED,
                500,
                f"Failed to process AI response: {str(e)}",
            )

    def _finalize_task_generation(self, json_response: Dict[str, Any], task_type: str, model_class: Type[TaskModelType]) -> TaskModelType:
        from utils.error_codes import TASK_VALIDATION_FAILED, raise_with_code
        json_response["id"] = str(uuid.uuid4())
        json_response["type"] = task_type
        try:
            return model_class(**json_response)
        except Exception as e:
            logger.error(f"Pydantic validation failed for {model_class.__name__}: {e}")
            raise_with_code(
                TASK_VALIDATION_FAILED,
                500,
                f"Failed to create valid {model_class.__name__}: {e}",
            )

