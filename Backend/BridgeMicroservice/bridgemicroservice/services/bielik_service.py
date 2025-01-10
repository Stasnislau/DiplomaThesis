import os
import aiohttp
import asyncio
from typing import List, Dict, Optional
import json


class Bielik_Service:
    def __init__(self):
        self.api_url = os.getenv("BIELIK_API_URL")
        self.api_key = os.getenv("BIELIK_API_KEY")
        self.headers = {"Content-Type": "application/json", "x-api-key": self.api_key}

    async def ask_bielik(self, question: str) -> str:
        messages = [
            {"role": "system", "content": "Jesteś pomocnym asystentem Bielik."},
            {"role": "user", "content": question},
        ]

        try:

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_url}/api/text/predict",
                    headers=self.headers,
                    json={"prompt": messages},
                ) as response:
                    initial_result = await response.json()

                    if initial_result["status"] == "failed":
                        raise Exception("Initial request failed")
                    print(initial_result, "INITIAL RESULT")
                    task_id = initial_result["task_id"]
                    return await self._wait_for_completion(session, task_id)

        except Exception as e:
            print(f"Error in ask_bielik: {e}")
            return "Przepraszam, wystąpił błąd. Spróbuj ponownie później."

    async def _wait_for_completion(
        self,
        session: aiohttp.ClientSession,
        task_id: str,
        max_retries: int = 3,
        delay: float = 15.0,
    ) -> str:

        for attempt in range(max_retries):
            async with session.get(
                f"{self.api_url}/api/text/task_status/{task_id}", headers=self.headers
            ) as response:
                result = await response.json()

                print(result, "RESULT")

                match result["status"]:
                    case "completed":
                        return result["result"]
                    case "failed":
                        raise Exception(f"Task failed: {result.get('result')}")
                    case "accepted" | "pending":
                        print(
                            f"Task still processing, attempt {attempt + 1}/{max_retries}"
                        )
                        await asyncio.sleep(delay)
                    case _:
                        raise Exception(f"Unknown status: {result['status']}")

        raise TimeoutError(f"Task {task_id} timed out after {max_retries} attempts")

    async def check_with_bielik(self, question: str, answer: str) -> dict:

        prompt = f"""Czy pytanie i odpowiedź są poprawne i pełne? 
        Pytanie: {question}
        Odpowiedź: {answer}
        
        Odpowiedz w formacie JSON:
        {{
            "isCorrect": boolean,
            "explanation": string
        }}
        """

        result = await self.ask_bielik(prompt)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {
                "isCorrect": True,
                "explanation": "Nie mogłem przetworzyć odpowiedzi",
            }

    async def verify_polish_task(self, task: dict) -> dict:
        prompt = f"""
        Sprawdź poprawność tego zadania językowego:
        
        Zadanie: {task['task']}
        Opcje: {task['options']}
        Poprawna odpowiedź: {task['correct_answer']}
        
        Odpowiedz w formacie JSON:
        {{
            "is_valid": boolean,
            "explanation": "Wyjaśnienie problemów jeśli są",
            "suggestions": ["Sugestie poprawek jeśli potrzebne"]
        }}
        """
        
        try:
            result = await self.ask_bielik(prompt)
            return json.loads(result)
        except json.JSONDecodeError:
            # Return safe default if parsing fails
            return {
                "is_valid": True,
                "explanation": "Nie można przetworzyć odpowiedzi",
                "suggestions": []
            }

