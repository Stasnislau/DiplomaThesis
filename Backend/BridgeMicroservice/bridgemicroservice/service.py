import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from typing import Dict, Any
from .bielikService import check_with_bielik_async
from litellm import completion
import asyncio

load_dotenv()

model = "gpt-4o-mini"

LEVEL_EMBEDDINGS: Dict[str, Dict[str, Any]] = {
    "A1": {
        "vocabulary": ["basic everyday expressions", "simple phrases"],
        "grammar": ["present simple", "basic adjectives"],
        "topics": ["personal information", "shopping", "local geography"],
        "can_do": ["introduce themselves", "ask simple questions"],
    },
    "A2": {
        "vocabulary": ["frequently used expressions", "elementary vocabulary"],
        "grammar": ["present continuous", "past simple", "future simple"],
        "topics": ["family", "work", "school", "leisure"],
        "can_do": ["describe routines", "talk about past activities"],
    },
    "B1": {
        "vocabulary": ["intermediate vocabulary", "common idioms"],
        "grammar": ["present perfect", "conditional sentences", "modal verbs"],
        "topics": ["travel", "culture", "personal relationships"],
        "can_do": ["describe experiences", "make plans"],
    },
    "B2": {
        "vocabulary": ["advanced vocabulary", "colloquial expressions"],
        "grammar": [
            "present perfect continuous",
            "future perfect",
            "future perfect continuous",
        ],
        "topics": ["workplace", "current events", "personal goals"],
        "can_do": ["discuss future plans", "express opinions"],
    },
    "C1": {
        "vocabulary": ["extensive vocabulary", "technical and specialized vocabulary"],
        "grammar": [
            "present perfect progressive",
            "future perfect progressive",
            "future perfect progressive continuous",
        ],
        "topics": ["global issues", "science and technology", "arts and culture"],
        "can_do": ["describe complex situations", "make predictions"],
    },
    "C2": {
        "vocabulary": ["extensive vocabulary", "technical and specialized vocabulary"],
        "grammar": [
            "present perfect progressive",
            "future perfect progressive",
            "future perfect progressive continuous",
        ],
        "topics": ["global issues", "science and technology", "arts and culture"],
        "can_do": ["describe complex situations", "make predictions"],
    },
}


def get_level_embedding(user_level: str) -> Dict[str, Any]:
    return LEVEL_EMBEDDINGS.get(user_level.upper(), {})


def get_openai_response(input_data):
    chat_response = completion(
        model=model,
        messages=[
            {"role": "user", "content": input_data},
        ],
        response_format={"type": "json_object"},
    )
    return chat_response.choices[0].message.content


async def generate_task(user_language: str, user_level: str):
    level_info = get_level_embedding(user_level)

    prompt = f"""
    Generate a language task in {user_language}, at level {user_level}. 
    Level details:
    - Vocabulary: {', '.join(level_info.get('vocabulary', []))}
    - Grammar: {', '.join(level_info.get('grammar', []))}
    - Topics: {', '.join(level_info.get('topics', []))}
    - Can do: {', '.join(level_info.get('can_do', []))}

    Create a fill-in-the-blank sentence in {user_language} that tests a specific vocabulary word or grammatical construction appropriate for this level. The sentence should have exactly one blank represented by an underscore ("____")
    and have the english translation of the asked word or phrase in () parentheses.
    .

    Return the response in the following JSON format:
    {{
        "task": "The sentence with a blank in {user_language}",
        "correct_answer": "The word or phrase to fill in the blank (in {user_language})"
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

        if user_language.lower() == "polish":
            # Используем await здесь
            bielik_check = await check_with_bielik_async(task, correct_answer)
            print(bielik_check, "bielik_check")

            if bielik_check.get("isCorrect") == False:
                return {
                    "task": bielik_check.get("correctQuestion"),
                    "correct_answer": bielik_check.get("correctAnswer"),
                }

        return {"task": task, "correct_answer": correct_answer}
    except json.JSONDecodeError:
        return {"error": "Failed to decode JSON"}


def explain_answer(
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

    response = get_openai_response(prompt)

    return json.loads(response)
