from services.writing_task_service import WritingTaskService
from .vector_db_service import VectorDBService
from .ai_service import AI_Service
from .user_service import UserService
from utils.user_context import UserContext
from constants.variety import variety_picker
import random
import json
import time
from dataclasses import dataclass, field
from typing import List, Optional, Dict

from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.evaluate_test_dto import EvaluateTestDto
from models.dtos.placement_dtos import PlacementAnswer, PlacementTestAnswer


LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
# Drop a placement session after this much idle time (no answers).
SESSION_TTL_SECONDS = 60 * 30


@dataclass
class _PlacementSession:
    """Per-user placement state. The previous design lived on the service
    instance, so two users testing in parallel would clobber each other's
    `current_level` (race condition: writes from user A bumped user B's
    difficulty). State now keyed by user_id with a soft TTL.
    """
    current_level: str = "A1"
    # Recent correctness flags, most-recent-last. Used for the 2-of-3 streak
    # rule below — far less jumpy than +1/-1 every answer.
    recent: List[bool] = field(default_factory=list)
    last_touched: float = field(default_factory=time.time)


class PlacementService:
    def __init__(self, ai_service: AI_Service, vector_db_service: VectorDBService):
        self.ai_service = ai_service
        self.vector_db_service = vector_db_service
        self.writing_task_service = WritingTaskService(vector_db_service, ai_service)
        self.user_service = UserService()
        # In-process per-user state. For multi-replica deploys this would
        # need to live in Redis; for the current single-bridge container
        # an in-memory dict is fine.
        self._sessions: Dict[str, _PlacementSession] = {}

    @property
    def current_level(self) -> str:
        """Backwards-compat shim for tests that read service.current_level
        without a user context. Returns the most recently touched session,
        or 'A1' if nothing yet."""
        if not self._sessions:
            return "A1"
        return max(self._sessions.values(), key=lambda s: s.last_touched).current_level

    @current_level.setter
    def current_level(self, value: str) -> None:
        # Tests in test_placement_service.py poke this directly. Keep them
        # working by writing into a synthetic session.
        sess = self._sessions.setdefault("__test__", _PlacementSession())
        sess.current_level = value
        sess.last_touched = time.time()

    def _session_for(self, user_context: Optional[UserContext]) -> _PlacementSession:
        key = user_context.user_id if user_context else "placement_anonymous"
        sess = self._sessions.get(key)
        now = time.time()
        # GC stale sessions on every touch — cheap and bounded.
        for k in list(self._sessions.keys()):
            if now - self._sessions[k].last_touched > SESSION_TTL_SECONDS:
                del self._sessions[k]
        if sess is None or now - sess.last_touched > SESSION_TTL_SECONDS:
            sess = _PlacementSession()
            self._sessions[key] = sess
        sess.last_touched = now
        return sess

    async def generate_placement_task(
        self,
        language: str,
        previous_answer: Optional[PlacementAnswer] = None,
        user_context: UserContext | None = None,
    ) -> MultipleChoiceTask | FillInTheBlankTask:
        sess = self._session_for(user_context)
        if previous_answer:
            self._adjust_for_session(sess, previous_answer.is_correct)

        session_key = user_context.user_id if user_context else "placement_global"
        random_topic = variety_picker.pick_topic(sess.current_level, session_key=session_key)

        task_type = random.choice(["multiple_choice", "fill_in_the_blank"])
        task: MultipleChoiceTask | FillInTheBlankTask
        try:
            if task_type == "multiple_choice":
                task = await self.writing_task_service.generate_writing_multiple_choice_task(
                    language, sess.current_level, user_context=user_context, topic=random_topic
                )
            else:
                task = await self.writing_task_service.generate_writing_fill_in_the_blank_task(
                    language, sess.current_level, user_context=user_context, topic=random_topic
                )
            return task

        except Exception as e:
            raise Exception(f"Failed to generate placement task: {e}")

    def _adjust_for_session(self, sess: _PlacementSession, was_correct: bool) -> None:
        """2-of-3 streak rule: bump up only after two correct in the last
        three; drop one level on a single wrong answer (stay-conservative).
        This produces far steadier convergence than +1/-1 per answer, which
        could land any final-level depending on noise late in the test."""
        sess.recent.append(was_correct)
        if len(sess.recent) > 3:
            sess.recent = sess.recent[-3:]
        idx = LEVELS.index(sess.current_level)

        if not was_correct:
            if idx > 0:
                sess.current_level = LEVELS[idx - 1]
            sess.recent = []  # reset streak after a miss
            return

        # Correct answer: count correct-in-last-3.
        if sum(sess.recent) >= 2 and idx < len(LEVELS) - 1:
            sess.current_level = LEVELS[idx + 1]
            sess.recent = []  # reset streak after a bump

    def adjust_difficulty(self, was_correct: bool) -> None:
        """Backwards-compat for unit tests that call the old method
        directly on the service. Routes into the synthetic session."""
        sess = self._sessions.setdefault("__test__", _PlacementSession())
        sess.last_touched = time.time()
        self._adjust_for_session(sess, was_correct)

    async def evaluate_test_results(
        self, answers: List[PlacementTestAnswer], language: str, user_context: UserContext | None = None
    ) -> EvaluateTestDto:
        print(f"Evaluating test results for {language} with answers: {answers}")
        try:
            if not answers:
                raise ValueError("The 'answers' list cannot be empty!")

            if not language or not isinstance(language, str):
                raise ValueError("A valid language string is required")

            correct_answers = len([a for a in answers if a.is_correct])
            total_questions = len(answers)
            percentage = (correct_answers / total_questions) * 100

            qa_lines = []
            for i, a in enumerate(answers, 1):
                status = "✓" if a.is_correct else "✗"
                qa_lines.append(
                    f"  Q{i}: {a.question}\n"
                    f"       User answered: \"{a.user_answer}\"  [{status}]"
                )
            qa_block = "\n".join(qa_lines)
            ui_lang = (
                getattr(user_context, "ui_locale_label", None) or "English"
            )

            prompt = f"""You are a language proficiency evaluator.
Evaluate the following {language} placement test.

Summary:
  - Total questions : {total_questions}
  - Marked correct  : {correct_answers}
  - Success rate    : {percentage:.0f}%

Question-by-question breakdown (re-verify each if needed — the user may have
given a close synonym or made a minor typo that was still marked wrong):

{qa_block}

Based on the above, return ONLY a JSON object (no markdown fences) with these fields:
{{
    "level": "<CEFR level A1-C2, e.g. B1>",
    "confidence": <integer 0-100>,
    "strengths": ["<strength 1>", "..."],
    "weaknesses": ["<area to improve 1>", "..."],
    "recommendation": "<personalised learning path recommendation>"
}}

EVIDENCE RULES (HARD):
  - Only list strengths and weaknesses that are visible in the answers above.
    Do NOT invent generic items like "good listening skills" if listening
    wasn't tested. If the data is too thin to support an item, leave it
    out — an empty list is acceptable.
  - At most 3 strengths and 3 weaknesses; merge duplicates.
  - `recommendation` must be a SINGLE concrete next step the user can take
    in this app (e.g. "Practise present-tense verb conjugations in the
    Writing tab"), not a generic study tip.

LOCALIZATION (HARD RULE):
  - Write `strengths`, `weaknesses` and `recommendation` in {ui_lang}.
  - `level` stays the literal CEFR code (A1/A2/B1/B2/C1/C2).
  - `confidence` stays a number.
"""


            result: str = await self.ai_service.get_ai_response(
                prompt, user_context=user_context
            )
            parsed_result = json.loads(result)

            print(f"Parsed result: {parsed_result}")

            if isinstance(parsed_result, list) and len(parsed_result) > 0:
                parsed_result = parsed_result[0]

            if not isinstance(parsed_result, dict):
                parsed_result = {
                    "level": "A1",
                    "confidence": 70,
                    "strengths": ["Basic vocabulary"],
                    "weaknesses": ["Grammar needs improvement"],
                    "recommendation": "Start with fundamentals",
                }

            for field in ["level", "confidence", "strengths", "weaknesses", "recommendation"]:
                if field not in parsed_result:
                    if field in ["strengths", "weaknesses"]:
                        parsed_result[field] = []
                    elif field == "confidence":
                        parsed_result[field] = 70
                    elif field == "level":
                        parsed_result[field] = "A1"
                    else:
                        parsed_result[field] = "Start with fundamentals"

            if not isinstance(parsed_result["strengths"], list):
                parsed_result["strengths"] = [parsed_result["strengths"]]
            if not isinstance(parsed_result["weaknesses"], list):
                parsed_result["weaknesses"] = [parsed_result["weaknesses"]]

            evaluation = EvaluateTestDto(**parsed_result)

            if user_context:
                from utils.language_codes import to_iso_language

                await self.user_service.log_task_history(
                    user_context,
                    {
                        "taskType": "placement",
                        "title": f"Placement test ({language})",
                        "score": int(percentage),
                        "language": to_iso_language(language),
                        "metadata": {
                            "level": evaluation.level,
                            "confidence": evaluation.confidence,
                            "totalQuestions": total_questions,
                            "correctAnswers": correct_answers,
                            # Save the structured weakness list — this
                            # is the primary signal /writing/adaptive,
                            # /listening/adaptive and the speaking
                            # practice-phrase generator read from.
                            "weaknesses": list(evaluation.weaknesses or []),
                            "strengths": list(evaluation.strengths or []),
                        },
                    },
                )

            return evaluation

        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response: {e}")
        except Exception as e:
            if isinstance(e, ValueError):
                print(f"ValueError in evaluate_test_results: {e}")
                raise
            print(f"Unexpected error in evaluate_test_results: {e}")
            raise
