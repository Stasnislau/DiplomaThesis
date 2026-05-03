import random
from collections import deque
from typing import Deque, Dict, List


# Massively expanded topic pool. The previous list of ~22 per tier was
# small enough that a 3-deep history filter caused the model to cycle
# through the same 6-7 topics repeatedly. With 60-80 per tier and the
# same history depth, perceived repetition drops below the user's
# attention horizon for a normal study session.
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
        "numbers and time",
        "body parts and feelings",
        "describing people",
        "describing places",
        "morning routine",
        "evening routine",
        "asking for directions",
        "introducing yourself",
        "small talk with neighbours",
        "ordering coffee",
        "buying groceries",
        "going to the cinema",
        "birthday parties",
        "describing your favourite room",
        "pets and animals",
        "favourite season",
        "kitchen and cooking basics",
        "school subjects",
        "the weekend plan",
        "what's in your bag",
        "describing a photo",
        "asking the time",
        "telephone basics",
        "going to the library",
        "writing a postcard",
        "online vs in-person",
        "your hometown",
        "favourite food on a holiday",
        "morning vs night person",
        "describing a friend",
        "best gift you received",
        "favourite childhood memory (simple)",
        "shopping at the market",
        "rainy day plans",
        "sunny day plans",
        "park and outdoor activities",
        "lost and found",
        "asking a stranger for help",
        "describing your room",
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
        "first day at a new job",
        "moving to another city",
        "a memorable concert",
        "a difficult decision",
        "habits worth breaking",
        "habits worth building",
        "going freelance",
        "studying abroad",
        "learning by doing",
        "remote work pros and cons",
        "online dating",
        "podcasts you trust",
        "advertising tricks",
        "second-hand vs new",
        "gentrification",
        "fashion and identity",
        "minimalism",
        "side projects",
        "negotiating salary",
        "dealing with conflict at work",
        "burnout",
        "starting a small business",
        "pet ownership in cities",
        "long-distance friendships",
        "cooking on a budget",
        "festivals and holidays abroad",
        "regional dialects",
        "documentaries vs feature films",
        "saving for a goal",
        "fitness routines",
        "hiking trips",
        "city break weekends",
        "renovation projects",
        "language exchange partners",
        "watching sports together",
        "moving in together",
        "becoming an aunt/uncle",
        "elderly care",
        "intergenerational households",
        "library vs bookshop",
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
        "universal basic income",
        "decentralized internet",
        "soft power in geopolitics",
        "influence of think tanks",
        "long-form journalism vs social media",
        "the attention economy",
        "limits of meritocracy",
        "post-scarcity economics",
        "ethics of human enhancement",
        "deepfakes and trust",
        "data sovereignty",
        "the future of democracy",
        "rise of populism",
        "the gig economy beyond hype",
        "circular economy in practice",
        "behavioural economics in policy",
        "philanthropy and accountability",
        "platform monopolies",
        "open source vs closed source software",
        "artificial creativity",
        "new forms of taxation",
        "non-violent communication",
        "the ethics of war reporting",
        "reform of higher education",
        "lifelong learning at scale",
        "language preservation programs",
        "the role of small states in global politics",
        "carbon offsets — credible or not",
        "the politics of pandemics",
        "future pandemics and preparedness",
        "ageing societies",
        "youth political engagement",
        "minimal government vs welfare state",
        "ethics of algorithmic ranking",
        "supply chain resilience",
        "cultural appropriation debates",
        "translation and untranslatable concepts",
        "creative non-fiction as journalism",
        "music streaming and artist pay",
    ],
}


# Expanded tones — the prompt picks one and the AI threads it through
# the whole task, so even with the same topic the *flavour* changes.
TONES: List[str] = [
    "neutral",
    "humorous",
    "dry-witty",
    "self-deprecating",
    "formal",
    "informal and friendly",
    "reflective",
    "suspenseful",
    "descriptive",
    "persuasive",
    "nostalgic",
    "matter-of-fact",
    "enthusiastic",
    "skeptical",
    "warm and encouraging",
    "tongue-in-cheek",
    "deadpan",
    "investigative",
    "lyrical",
    "conspiratorial",
]


# Listening formats by level — a wider net so the same student gets a
# news clip, a voicemail, and a panel discussion in the same session.
FORMATS_BY_LEVEL: Dict[str, List[str]] = {
    "beginner": [
        "short monologue",
        "phone conversation",
        "radio announcement",
        "voice message",
        "short dialogue between friends",
        "shop assistant conversation",
        "schoolyard chat",
        "weather report",
        "supermarket announcement",
        "answering machine message",
        "directions over the phone",
        "cafe order",
        "introduction at a party",
        "doctor receptionist call",
    ],
    "intermediate": [
        "podcast excerpt",
        "news report",
        "interview",
        "workplace conversation",
        "travel vlog narration",
        "customer service call",
        "review-show segment",
        "tech-podcast intro",
        "two-friend catch-up",
        "presentation opening",
        "team stand-up snippet",
        "Airbnb host walk-through",
        "language-exchange dialogue",
        "negotiation about price",
        "restaurant review monologue",
    ],
    "advanced": [
        "TED-style talk excerpt",
        "panel discussion snippet",
        "academic lecture",
        "investigative podcast",
        "documentary narration",
        "debate",
        "courtroom-style cross-examination",
        "research-paper Q&A",
        "policy briefing",
        "long-form interview tail",
        "satirical commentary",
        "diplomatic statement",
        "literary criticism segment",
        "philosophical dialogue",
        "expert testimony",
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
    def __init__(self, history_size: int = 6) -> None:
        # Wider history so re-rolls don't land on the same 3-cycle. With
        # the 60-80-topic pool above, a 6-deep filter still leaves plenty
        # of candidates and eliminates the perceptual repeats people
        # noticed in QA.
        self._recent_topics: Dict[str, Deque[str]] = {}
        self._recent_tones: Dict[str, Deque[str]] = {}
        self._recent_formats: Dict[str, Deque[str]] = {}
        self._history_size = history_size

    def _topic_history(self, session_key: str) -> Deque[str]:
        if session_key not in self._recent_topics:
            self._recent_topics[session_key] = deque(maxlen=self._history_size)
        return self._recent_topics[session_key]

    def _tone_history(self, session_key: str) -> Deque[str]:
        if session_key not in self._recent_tones:
            self._recent_tones[session_key] = deque(maxlen=self._history_size)
        return self._recent_tones[session_key]

    def _format_history(self, session_key: str) -> Deque[str]:
        if session_key not in self._recent_formats:
            self._recent_formats[session_key] = deque(maxlen=self._history_size)
        return self._recent_formats[session_key]

    def pick_topic(self, level: str, session_key: str = "global") -> str:
        tier = tier_for_level(level)
        pool = TOPICS_BY_TIER[tier]
        recent = self._topic_history(session_key)
        candidates = [t for t in pool if t not in recent] or pool
        chosen = random.choice(candidates)
        recent.append(chosen)
        return chosen

    def pick_tone(self, session_key: str = "global") -> str:
        recent = self._tone_history(session_key)
        candidates = [t for t in TONES if t not in recent] or TONES
        chosen = random.choice(candidates)
        recent.append(chosen)
        return chosen

    def pick_format(self, level: str, session_key: str = "global") -> str:
        tier = tier_for_level(level)
        pool = FORMATS_BY_LEVEL[tier]
        recent = self._format_history(session_key)
        candidates = [f for f in pool if f not in recent] or pool
        chosen = random.choice(candidates)
        recent.append(chosen)
        return chosen

    def pick_bundle(
        self, level: str, session_key: str = "global"
    ) -> Dict[str, str]:
        return {
            "topic": self.pick_topic(level, session_key),
            "tone": self.pick_tone(session_key),
            "format": self.pick_format(level, session_key),
        }


variety_picker = VarietyPicker()
