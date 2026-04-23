import random
from collections import deque
from typing import Deque, Dict, List, Optional


TOPICS_BY_TIER: Dict[str, List[str]] = {
    "beginner": [
        "daily routine",
        "family",
        "friends",
        "food",
        "shopping",
        "clothes",
        "weather",
        "home",
        "school",
        "animals",
        "hobbies",
        "music",
        "sports",
        "travel",
        "holidays",
        "weekends",
        "the city",
        "the countryside",
        "at a restaurant",
        "at a doctor",
        "public transport",
        "colors and shapes",
    ],
    "intermediate": [
        "work and career",
        "technology in daily life",
        "social media",
        "environmental issues",
        "healthy lifestyle",
        "cultural traditions",
        "education systems",
        "money and personal finance",
        "friendship across cultures",
        "travel experiences",
        "job interview",
        "renting an apartment",
        "urban vs rural life",
        "food trends",
        "sports and competition",
        "music genres and influence",
        "film and series",
        "books that changed my mind",
        "volunteering",
        "generations and values",
        "learning a new skill",
    ],
    "advanced": [
        "artificial intelligence and ethics",
        "climate change policy",
        "privacy in the digital age",
        "globalization and local identity",
        "mental health in society",
        "future of work",
        "space exploration",
        "genetic engineering",
        "media bias and misinformation",
        "migration and integration",
        "wealth inequality",
        "cybersecurity threats",
        "psychology of decision making",
        "role of art in society",
        "history through different perspectives",
        "philosophy of happiness",
        "biotechnology breakthroughs",
        "sustainable development",
        "linguistic diversity",
        "neuroscience and learning",
        "ethics of automation",
    ],
}

TONES: List[str] = [
    "neutral",
    "humorous",
    "formal",
    "informal and friendly",
    "reflective",
    "suspenseful",
    "descriptive",
    "persuasive",
]

FORMATS_BY_LEVEL: Dict[str, List[str]] = {
    "beginner": [
        "short monologue",
        "phone conversation",
        "radio announcement",
        "voice message",
        "short dialogue between friends",
    ],
    "intermediate": [
        "podcast excerpt",
        "news report",
        "interview",
        "workplace conversation",
        "travel vlog narration",
        "customer service call",
    ],
    "advanced": [
        "TED-style talk excerpt",
        "panel discussion snippet",
        "academic lecture",
        "investigative podcast",
        "documentary narration",
        "debate",
    ],
}


def tier_for_level(level: str) -> str:
    lvl = level.upper()
    if lvl in ("A1", "A2"):
        return "beginner"
    if lvl in ("B1", "B2"):
        return "intermediate"
    return "advanced"


class VarietyPicker:
    def __init__(self, history_size: int = 3) -> None:
        self._recent_topics: Dict[str, Deque[str]] = {}
        self._history_size = history_size

    def _history(self, session_key: str) -> Deque[str]:
        if session_key not in self._recent_topics:
            self._recent_topics[session_key] = deque(maxlen=self._history_size)
        return self._recent_topics[session_key]

    def pick_topic(self, level: str, session_key: str = "global") -> str:
        tier = tier_for_level(level)
        pool = TOPICS_BY_TIER[tier]
        recent = self._history(session_key)
        candidates = [t for t in pool if t not in recent] or pool
        chosen = random.choice(candidates)
        recent.append(chosen)
        return chosen

    def pick_tone(self) -> str:
        return random.choice(TONES)

    def pick_format(self, level: str) -> str:
        tier = tier_for_level(level)
        return random.choice(FORMATS_BY_LEVEL[tier])

    def pick_bundle(
        self, level: str, session_key: str = "global"
    ) -> Dict[str, str]:
        return {
            "topic": self.pick_topic(level, session_key),
            "tone": self.pick_tone(),
            "format": self.pick_format(level),
        }


variety_picker = VarietyPicker()
