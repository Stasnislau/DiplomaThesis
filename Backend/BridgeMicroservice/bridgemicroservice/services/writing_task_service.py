import json
from .vector_db_service import VectorDBService
from .ai_service import AI_Service
from dotenv import load_dotenv

load_dotenv()


class Writing_Task_Service:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service):
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service

    async def generate_writing_multiple_choice_task(self, language: str, level: str):
        level_context = self.vector_db_service.get_level_context(
            level.upper(), "writing"
        )
        print(level_context, "here level context")
        if not level_context:
            raise ValueError(f"Invalid level: {level}")

        prompt = (
            f"Generate a JSON response for a language learning task. The task should be a 'multiple choice' writing task in {language} "
            f"for learners at the {level} level. Create an engaging question that matches the {level} level in {language}. "
            "Provide the following fields in the JSON format:\n\n"
            "```json\n"
            "{\n"
            "  'task': 'The multiple choice writing task prompt, describing the question for the user',\n"
            "  'options': ['Option A', 'Option B', 'Option C', 'Option D'],\n"
            "  'correct_answer': 'The correct answer (e.g., 'A')'\n"
            "}\n"
            "```\n"
            "The response must be strictly in JSON format."
        )

        response = await self.ai_service.get_ai_response(prompt)

        # add type of the task to the response

        json_response = json.loads(response)
        json_response["type"] = "multiple_choice"

        return json_response

    async def generate_writing_fill_in_the_blank_task(self, language: str, level: str):
        level_context = self.vector_db_service.get_level_context(
            level.upper(), "writing"
        )

        if not level_context:
            raise ValueError(f"Invalid level: {level}")

        prompt = f"""
        Generate a language learning task in {language} at {level} level.
        
        Level proficiency description:
        {level_context}
        
        Create a fill-in-the-blank sentence that matches this level's requirements.
        The sentence should:
        1. Have exactly one blank marked with ____
        2. Test appropriate vocabulary or grammar for this level
        3. Include the English translation of the missing word/phrase in parentheses
        4. Be relevant to the skills described for this level
        
        Return the task and correct answer in JSON format:
        {{
            "task": "your sentence with ____",
            "correct_answer": "the word that goes in the blank"
        }}
        """

        response = await self.ai_service.get_ai_response(prompt)
        json_response = json.loads(response)
        json_response["type"] = "fill_in_the_blank"

        return json_response

    async def generate_find_the_error_task(self, language: str, level: str):
        pass

    async def generate_write_a_sentence_task(self, language: str, level: str):
        pass

    async def generate_custom_writing_task(
        self, language: str, level: str, task_type: str
    ):
        pass

    async def explain_answer(
        self,
        user_language: str,
        user_level: str,
        task: str,
        correct_answer: str,
        user_answer: str,
    ):
        prompt = f"""
        Analyze the following language task in {user_language}, at level {user_level}:

        Task: {task}
        Correct answer: {correct_answer}
        User's answer: {user_answer}

        Provide a brief explanation of whether the user's answer is correct or not, and why. If incorrect, suggest what topics the user should review. Keep the explanation concise and precise.

        Return the response in the following JSON format:
        {{
        "is_correct": boolean,
        "explanation": "Brief explanation",
        "topics_to_review": ["Topic 1", "Topic 2"] // Only if the answer is incorrect
        }}

        Do not include any additional wrapping or metadata.
        """

        response = await self.ai_service.get_ai_response(prompt)

        return json.loads(response)
