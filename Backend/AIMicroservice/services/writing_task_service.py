import json
import uuid
import logging
from typing import Union, Any, Dict, Type, TypeVar, Optional, Callable, List
from services.vector_db_service import VectorDBService
from services.ai_service import AI_Service
from utils.user_context import UserContext
from dotenv import load_dotenv
from constants.prompts import (
    writing_multiple_choice_task_prompt,
    writing_fill_in_the_blank_task_prompt,
    explain_answer_prompt,
    writing_essay_topic_prompt,
    writing_essay_evaluation_prompt,
)
from constants.variety import variety_picker
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.essay_dto import EssayTask, EssayEvaluation
from models.dtos.vector_db_dtos import SpecificSkillContext, FullLevelContext
from models.request.explain_answer_request import ExplainAnswerRequest
from models.responses.explain_answer_response import ExplainAnswerResponse
from pipelines.verification_pipeline import VerificationPipeline
from pydantic import BaseModel
from utils.json_response import parse_json_object
from utils.task_quality import (
    fill_in_the_blank_quality_issues,
    multiple_choice_quality_issues,
    sanitize_multiple_choice,
)
from utils.error_codes import AI_RESPONSE_PARSE_FAILED, TASK_VALIDATION_FAILED, raise_with_code

load_dotenv()

logger = logging.getLogger("ai_microservice")

TaskModelType = TypeVar("TaskModelType", bound=BaseModel)

_EXEMPLAR_LIMIT = 3
_EXEMPLAR_MAX_CHARS = 400
_QUALITY_ATTEMPTS = 3


class WritingTaskService:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service):
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service
        self.verification_pipeline = VerificationPipeline(ai_service)

    def _retrieve_exemplars(
        self,
        level: str,
        skill: str,
        task_type: str,
        user_context: Optional[UserContext] = None,
    ) -> list[str]:
        if not user_context or not user_context.user_id:
            return []

        query = f"{task_type} task for {skill} practice at CEFR level {level}"
        try:
            templates = self.vector_db_service.search_task_templates(
                query,
                limit=_EXEMPLAR_LIMIT,
                user_id=user_context.user_id,
            )
            exemplars: list[str] = []
            for template in templates:
                text = (getattr(template, "template", "") or "").strip()
                if text:
                    exemplars.append(text[:_EXEMPLAR_MAX_CHARS])
            return exemplars
        except Exception as e:
            logger.debug(f"Exemplar retrieval failed, generating without: {e}")
            return []

    async def generate_writing_multiple_choice_task(
        self, language: str, level: str, user_context: Optional[UserContext] = None,
        topic: Optional[str] = None, keywords: Optional[list[str]] = None,
        weaknesses: Optional[list[str]] = None,
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

        exemplars = self._retrieve_exemplars(
            level=effective_level,
            skill="writing",
            task_type="multiple_choice",
            user_context=user_context,
        )

        def _prompt() -> str:
            return writing_multiple_choice_task_prompt(
                language, level, level_context.model_dump(),
                topic=topic, keywords=keywords, weaknesses=weaknesses,
                seed=str(uuid.uuid4()),
                ui_locale_label=user_context.ui_locale_label if user_context else None,
                exemplars=exemplars,
            )

        json_response = await self._sample_task_json(
            make_prompt=_prompt,
            user_context=user_context,
            temperature=0.7,
            issues_for=multiple_choice_quality_issues,
            sanitize=sanitize_multiple_choice,
        )
        logger.debug("Multiple choice task generated successfully")
        return self._finalize_task_generation(
            json_response, "multiple_choice", MultipleChoiceTask
        )

    async def generate_writing_fill_in_the_blank_task(
        self, language: str, level: str, user_context: Optional[UserContext] = None,
        topic: Optional[str] = None, keywords: Optional[list[str]] = None,
        weaknesses: Optional[list[str]] = None,
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

        exemplars = self._retrieve_exemplars(
            level=effective_level,
            skill="writing",
            task_type="fill_in_the_blank",
            user_context=user_context,
        )

        def _prompt() -> str:
            return writing_fill_in_the_blank_task_prompt(
                language, level, level_context.model_dump(),
                topic=topic, keywords=keywords, weaknesses=weaknesses,
                seed=str(uuid.uuid4()),
                ui_locale_label=user_context.ui_locale_label if user_context else None,
                exemplars=exemplars,
            )

        json_response = await self._sample_task_json(
            make_prompt=_prompt,
            user_context=user_context,
            temperature=0.7,
            issues_for=fill_in_the_blank_quality_issues,
        )
        return self._finalize_task_generation(
            json_response, "fill_in_the_blank", FillInTheBlankTask
        )

    async def generate_essay_task(
        self,
        language: str,
        level: str,
        user_context: Optional[UserContext] = None,
        topic: Optional[str] = None,
        keywords: Optional[list[str]] = None,
    ) -> EssayTask:
        effective_level = "A1" if level.upper() == "A0" else level.upper()
        level_context: Union[SpecificSkillContext, FullLevelContext, None] = (
            self.vector_db_service.get_level_context(effective_level, "writing")
        )
        if not level_context:
            raise ValueError(f"Invalid level: {effective_level}")

        seed = str(uuid.uuid4())
        prompt = writing_essay_topic_prompt(
            language,
            level,
            level_context.model_dump(),
            topic_hint=topic,
            keywords=keywords,
            seed=seed,
            ui_locale_label=user_context.ui_locale_label if user_context else None,
        )
        response = await self.ai_service.get_ai_response(
            prompt, user_context=user_context, temperature=0.85
        )
        json_response = await self._process_ai_response_and_validate(response)

        return self._finalize_task_generation(json_response, "essay", EssayTask)

    async def evaluate_essay(
        self,
        language: str,
        level: str,
        topic: str,
        essay: str,
        word_count_target: int,
        user_context: Optional[UserContext] = None,
    ) -> EssayEvaluation:
        effective_level = "A1" if level.upper() == "A0" else level.upper()
        level_context: Union[SpecificSkillContext, FullLevelContext, None] = (
            self.vector_db_service.get_level_context(effective_level, "writing")
        )
        if not level_context:
            raise ValueError(f"Invalid level: {effective_level}")

        prompt = writing_essay_evaluation_prompt(
            language,
            level,
            level_context.model_dump(),
            topic=topic,
            essay=essay,
            word_count_target=word_count_target,
            ui_locale_label=user_context.ui_locale_label if user_context else None,
        )
        response = await self.ai_service.get_ai_response(
            prompt, user_context=user_context, temperature=0.2
        )
        json_response = await self._process_ai_response_and_validate(response)

        json_response.setdefault("wordCount", len(essay.split()))
        json_response.setdefault("wordCountTarget", word_count_target)
        try:
            score = int(json_response.get("score", 0))
        except (TypeError, ValueError):
            score = 0
        score = max(0, min(100, score))
        json_response["score"] = score
        json_response["passed"] = score >= 60

        try:
            return EssayEvaluation(**json_response)
        except Exception as e:
            logger.error(f"EssayEvaluation validation failed: {e}")
            raise_with_code(
                TASK_VALIDATION_FAILED,
                500,
                f"Failed to parse essay evaluation: {e}",
            )

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
        recurring_errors: Optional[list[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        weaknesses: list[str] = []
        keywords: list[str] = []
        topics: list[str] = []

        for row in (recurring_errors or [])[:3]:
            if not isinstance(row, dict):
                continue
            correction = row.get("correction")
            if isinstance(correction, str) and correction.strip():
                weaknesses.append(correction.strip())
            error_type = row.get("errorType")
            if isinstance(error_type, str) and error_type.strip():
                weaknesses.append(error_type.strip())
            text = row.get("errorText")
            if isinstance(text, str) and text.strip():
                keywords.append(text.strip())

        for entry in history_entries:
            meta = entry.get("metadata") or {}
            ttype = entry.get("taskType")

            w = meta.get("weaknesses")
            if isinstance(w, list):
                weaknesses.extend(str(x) for x in w if x)
            elif isinstance(w, str) and w.strip():
                weaknesses.append(w.strip())

            etypes = meta.get("errorTypes")
            if isinstance(etypes, list):
                keywords.extend(str(x) for x in etypes if x)

            ex = meta.get("errorExamples")
            if isinstance(ex, list):
                for item in ex[:3]:
                    if isinstance(item, dict) and item.get("text"):
                        keywords.append(str(item["text"]))

            score = entry.get("score")
            if isinstance(score, (int, float)) and score < 60:
                t = meta.get("topic")
                if isinstance(t, str) and t.strip():
                    topics.append(t.strip())

            if (
                ttype == "writing"
                and meta.get("adaptive") is True
                and isinstance(meta.get("targetedWeaknesses"), list)
                and (score is None or (isinstance(score, (int, float)) and score < 60))
            ):
                weaknesses.extend(
                    str(x) for x in meta["targetedWeaknesses"] if x
                )
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

    async def _sample_task_json(
        self,
        *,
        make_prompt: Callable[[], str],
        user_context: Optional[UserContext],
        temperature: float,
        issues_for: Callable[[Dict[str, Any]], List[str]],
        sanitize: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        last_json: Optional[Dict[str, Any]] = None
        last_issues: list[str] = []
        for attempt in range(_QUALITY_ATTEMPTS):
            prompt = make_prompt()
            if last_issues:
                prompt = (
                    "PREVIOUS ATTEMPT REJECTED: "
                    + "; ".join(last_issues)
                    + ". Fix every listed issue. Do not repeat the same sentence.\n\n"
                    + prompt
                )
            response = await self.ai_service.get_ai_response(
                prompt, user_context=user_context, temperature=temperature
            )
            try:
                parsed = parse_json_object(response)
            except (json.JSONDecodeError, ValueError):
                last_issues = ["response was not valid JSON"]
                logger.warning(
                    "task generation attempt %d/%d: invalid JSON",
                    attempt + 1,
                    _QUALITY_ATTEMPTS,
                )
                continue
            if sanitize is not None:
                parsed = sanitize(parsed)
            last_issues = issues_for(parsed)
            last_json = parsed
            if not last_issues:
                return parsed
            logger.warning(
                "task generation attempt %d/%d rejected: %s",
                attempt + 1,
                _QUALITY_ATTEMPTS,
                last_issues,
            )
        if last_json is None:
            raise_with_code(
                AI_RESPONSE_PARSE_FAILED,
                500,
                "Failed to parse AI response into expected JSON structure.",
            )
        return last_json

    async def _process_ai_response_and_validate(self, response_str: str, is_fill_in_blank: bool = False) -> Dict[str, Any]:
        try:
            return parse_json_object(response_str)
        except (json.JSONDecodeError, ValueError) as e:
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

