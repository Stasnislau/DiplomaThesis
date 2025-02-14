from .writing_task_service import Writing_Task_Service
from .vector_db_service import VectorDBService
from .ai_service import AI_Service
import random
import json

class Placement_Service:
    def __init__(
        self,
        ai_service: AI_Service,
        vector_db_service: VectorDBService
    ):
        self.ai_service = ai_service
        self.vector_db_service = vector_db_service
        self.writing_task_service = Writing_Task_Service(vector_db_service, ai_service)
        self.current_level = "B1"  # Default starting level

    async def generate_placement_task(self, language: str, previous_answer: dict = None):
        if previous_answer:
            self.adjust_difficulty(previous_answer["isCorrect"])

        # Randomly choose between multiple choice and fill in the blank
        task_type = random.choice(["multiple_choice", "fill_in_the_blank"])
        
        try:
            if task_type == "multiple_choice":
                task = await self.writing_task_service.generate_writing_multiple_choice_task(
                    language,
                    self.current_level
                )
            else:
                task = await self.writing_task_service.generate_writing_fill_in_the_blank_task(
                    language,
                    self.current_level
                )
            
            # Add current level to response for frontend tracking
            task["level"] = self.current_level
            return task

        except Exception as e:
            raise Exception(f"Failed to generate placement task: {e}")

    def adjust_difficulty(self, was_correct: bool):
        levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        current_index = levels.index(self.current_level)
        
        if was_correct and current_index < len(levels) - 1:
            self.current_level = levels[current_index + 1]
        elif not was_correct and current_index > 0:
            self.current_level = levels[current_index - 1]

    async def evaluate_test_results(self, answers: list, language: str):
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

        result = await self.ai_service.get_ai_response(prompt)
        return json.loads(result) 