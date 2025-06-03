from .writing_task_service import Writing_Task_Service
from .vector_db_service import VectorDBService
from .ai_service import AI_Service
import random
import json
from models.dtos.evaluate_test_dto import EvaluateTestDto
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask

class Placement_Service:
    def __init__(self, ai_service: AI_Service, vector_db_service: VectorDBService):
        self.ai_service = ai_service
        self.vector_db_service = vector_db_service
        self.writing_task_service = Writing_Task_Service(vector_db_service, ai_service)
        self.current_level = "B1"

    async def generate_placement_task(self, language: str, previous_answer: dict | None = None) -> MultipleChoiceTask | FillInTheBlankTask:
        if previous_answer:
            self.adjust_difficulty(previous_answer["isCorrect"])

        task_type = random.choice(["multiple_choice", "fill_in_the_blank"])
        task: MultipleChoiceTask | FillInTheBlankTask
        try:
            if task_type == "multiple_choice":
                task = await self.writing_task_service.generate_writing_multiple_choice_task(language, self.current_level)
            else:
                task = await self.writing_task_service.generate_writing_fill_in_the_blank_task(language, self.current_level)
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

    async def evaluate_test_results(self, answers: list, language: str) -> EvaluateTestDto:
        try:
            # Validate input parameters
            if not isinstance(answers, list):
                raise ValueError("The 'answers' parameter must be a list")

            if not answers:
                raise ValueError("The 'answers' list cannot be empty")

            for i, answer in enumerate(answers):
                if not isinstance(answer, dict):
                    raise ValueError(f"Answer at index {i} must be a dictionary")

                # Check for required fields in each answer
                if "isCorrect" not in answer:
                    raise ValueError(f"Answer at index {i} missing 'isCorrect' field")

                if not isinstance(answer.get("isCorrect"), bool):
                    raise ValueError(f"'isCorrect' at index {i} must be a boolean")

            if not language or not isinstance(language, str):
                raise ValueError("A valid language string is required")

            # Proceed with the evaluation
            correct_answers = len([a for a in answers if a["isCorrect"]])
            total_questions = len(answers)
            percentage = (correct_answers / total_questions) * 100

            prompt = f"""Evaluate the language placement test results for {language}:
            - Total questions: {total_questions}
            - Correct answers: {correct_answers}
            - Success rate: {percentage}%

            Analyze the following answers:
            {json.dumps(answers, indent=2)}

            Provide a detailed evaluation in JSON format:
            {{
                "level": string,  // Recommended CEFR level (A1-C2)
                "confidence": number,  // Confidence score 0-100
                "strengths": string[],  // List of strong areas
                "weaknesses": string[],  // List of areas to improve
                "recommendation": string  // Learning path recommendation
            }}
            """

            result: str = await self.ai_service.get_ai_response(prompt)
            parsed_result = json.loads(result)

            # Handle case where AI might return a list instead of a dict
            if isinstance(parsed_result, list) and len(parsed_result) > 0:
                parsed_result = parsed_result[0]  # Take the first item if it's a list

            # Ensure we have all required fields with fallbacks
            if not isinstance(parsed_result, dict):
                # Create fallback evaluation if response format is completely wrong
                parsed_result = {
                    "level": "A1",
                    "confidence": 70,
                    "strengths": ["Basic vocabulary"],
                    "weaknesses": ["Grammar needs improvement"],
                    "recommendation": "Start with fundamentals",
                }

            # Make sure all required fields exist
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

            # Ensure lists are actually lists
            if not isinstance(parsed_result["strengths"], list):
                parsed_result["strengths"] = [parsed_result["strengths"]]
            if not isinstance(parsed_result["weaknesses"], list):
                parsed_result["weaknesses"] = [parsed_result["weaknesses"]]

            return EvaluateTestDto(**parsed_result)

        except json.JSONDecodeError as e:
            # Handle AI response parsing errors
            raise ValueError(f"Failed to parse AI response: {e}")
        except Exception as e:
            # Re-raise as ValueError if it's related to validation
            if isinstance(e, ValueError):
                raise
            # Log unexpected errors and raise a more generic exception
            print(f"Unexpected error in evaluate_test_results: {e}")
            raise
