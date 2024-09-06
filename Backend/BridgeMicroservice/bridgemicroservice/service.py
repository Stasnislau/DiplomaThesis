import os
from mistralai import Mistral
import json

from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("MISTRAL_API_KEY")
model = "open-mistral-nemo-2407"
client = Mistral(api_key=api_key)


def get_mistral_response(input_data):
    chat_response = client.chat.complete(
        model=model,
        messages=[
            {
                "role": "user",
                "content": input_data,
            },
        ],
    )
    return chat_response.choices[0].message.content


def generate_task(user_language: str, user_level: str):
    prompt = f"""
    Generate a language task in {user_language}, at level {user_level}. Create a sentence in {user_language} with a blank represented by an underscore ("____") and include a word or phrase in parentheses to be filled in. The word or phrase in parentheses should be provided in English. Return only the `task` and `correct_answer` fields in JSON format.

    The JSON should have the following format:
    {{
        "task": "The sentence with a blank and the word in parentheses (in {user_language} and the option in English)",
        "correct_answer": "The word to fill in the blank (in {user_language})"
    }}

    Do not include any additional wrapping or metadata.
    """

    chat_response = client.chat.complete(
        model=model,
        messages=[
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    raw_response = chat_response.choices[0].message.content.strip()

    try:
        json_response = json.loads(raw_response)

        task = json_response.get("task")
        correct_answer = json_response.get("correct_answer")

        # Return the `task` and `correct_answer` directly
        return {
            "task": task,
            "correct_answer": correct_answer
        }
    except json.JSONDecodeError:
        return {"error": "Failed to decode JSON"}
