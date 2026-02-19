from services.writing_task_service import WritingTaskService
from .vector_db_service import VectorDBService
from .ai_service import AI_Service
from utils.user_context import UserContext
import random
import json
from typing import List, Optional

from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.evaluate_test_dto import EvaluateTestDto
from models.dtos.placement_dtos import PlacementAnswer, PlacementTestAnswer


class PlacementService:
    def __init__(self, ai_service: AI_Service, vector_db_service: VectorDBService):
        self.ai_service = ai_service
        self.vector_db_service = vector_db_service
        self.writing_task_service = WritingTaskService(vector_db_service, ai_service)
        self.current_level = "A1"  # Default starting level

    async def generate_placement_task(
        self,
        language: str,
        previous_answer: Optional[PlacementAnswer] = None,
        user_context: UserContext | None = None,
    ) -> MultipleChoiceTask | FillInTheBlankTask:
        if previous_answer:
            self.adjust_difficulty(previous_answer.is_correct)

        task_type = random.choice(["multiple_choice", "fill_in_the_blank"])
        task: MultipleChoiceTask | FillInTheBlankTask
        try:
            if task_type == "multiple_choice":
                task = await self.writing_task_service.generate_writing_multiple_choice_task(
                    language, self.current_level, user_context=user_context
                )
            else:
                task = await self.writing_task_service.generate_writing_fill_in_the_blank_task(
                    language, self.current_level, user_context=user_context
                )
            return task

        except Exception as e:
            raise Exception(f"Failed to generate placement task: {e}")

    def adjust_difficulty(self, was_correct: bool) -> None:
        levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        current_index = levels.index(self.current_level)
        if was_correct and current_index < len(levels) - 1:
            self.current_level = levels[current_index + 1]
        elif not was_correct and current_index > 0:
            self.current_level = levels[current_index - 1]

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

            # Build a readable Q&A list for the AI to re-verify each answer
            qa_lines = []
            for i, a in enumerate(answers, 1):
                status = "✓" if a.is_correct else "✗"
                qa_lines.append(
                    f"  Q{i}: {a.question}\n"
                    f"       User answered: \"{a.user_answer}\"  [{status}]"
                )
            qa_block = "\n".join(qa_lines)

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

            return EvaluateTestDto(**parsed_result)

        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response: {e}")
        except Exception as e:
            if isinstance(e, ValueError):
                print(f"ValueError in evaluate_test_results: {e}")
                raise
            print(f"Unexpected error in evaluate_test_results: {e}")
            raise
