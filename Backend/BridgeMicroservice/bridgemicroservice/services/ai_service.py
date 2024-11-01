import json
from dotenv import load_dotenv
from .bielik_service import Bielik_Service
from litellm import completion
from ..constants.constants import get_level_embedding
from langchain.chat_models import ChatOpenAI, ChatMistral
load_dotenv()

model = "gpt-4o-mini"


class AI_Service:
    def __init__(self, bielik_service: Bielik_Service):
        self.bielik_service = bielik_service

    def get_ai_response(self, input_data):
        chat_response = completion(
            model=model,
            messages=[
                {"role": "user", "content": input_data},
            ],
            response_format={"type": "json_object"},
        )
        return chat_response.choices[0].message.content

    async def generate_task(self, language: str, level: str):
        bielik_check = {"isCorrect": True}

        level_info = get_level_embedding(level)

        prompt = f"""
        Generate a language task in {language}, at level {level}. 
        Level details:
        - Vocabulary: {', '.join(level_info.get('vocabulary', []))}
        - Grammar: {', '.join(level_info.get('grammar', []))}
        - Topics: {', '.join(level_info.get('topics', []))}
        - Can do: {', '.join(level_info.get('can_do', []))}

        Create a fill-in-the-blank sentence in {language} that tests a specific vocabulary word or grammatical construction appropriate for this level. The sentence should have exactly one blank represented by an underscore ("____")
        and have the english translation of the asked word or phrase in () parentheses.
        .

        Return the response in the following JSON format:
        {{
        "task": "The sentence with a blank in {language}",
        "correct_answer": "The word or phrase to fill in the blank (in {language})"
        }}
    

        Do not include any additional wrapping or metadata.
        """

        chat_response = completion(
            model=model,
            messages=[
                {"role": "user", "content": prompt},
            ],
        )

        raw_response = chat_response.choices[0].message.content.strip()

        print(raw_response, "raw_response")

        try:
            json_response = json.loads(raw_response)

            task = json_response.get("task")
            correct_answer = json_response.get("correct_answer")

            if language.lower() == "polish":
                bielik_check = await self.bielik_service.check_with_bielik_async(
                    task, correct_answer
                )
                print(bielik_check, "bielik_check")

            if bielik_check.get("isCorrect") == False:
                return {
                    "task": bielik_check.get("correctQuestion"),
                    "correct_answer": bielik_check.get("correctAnswer"),
                }

            return {"task": task, "correct_answer": correct_answer}
        except json.JSONDecodeError:
            return {"error": "Failed to decode JSON"}

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

        response = self.get_ai_response(prompt)

        return json.loads(response)
    
    async def generate_task_with_langchain(self, language: str, level: str):
        pass
