from typing import Any, Dict


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


AVAILABLE_LANGUAGES = ["polish", "english", "german", "french", "spanish", "italian", "russian"]

AVAILABLE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

AVAILABLE_MODELS = [
    {
        "name": "Mistral",
        "model": "mistral-7b-instruct"
    },
    {
        "name": "OpenAI",
        "model": "gpt-4o-mini"
    },
]
