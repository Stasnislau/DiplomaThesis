from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class LessonDto(BaseModel):
    id: str
    title: str
    topic: str                   # Human-readable topic, e.g. "Greetings & Introductions"
    description: str             # Short lesson description
    status: str                  # LOCKED, UNLOCKED, COMPLETED
    type: str                    # theory, vocabulary, grammar, practice, listening, speaking
    keywords: List[str]          # Key vocab / grammar points for this lesson
    duration_minutes: int        # Estimated duration

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class ModuleDto(BaseModel):
    id: str
    title: str
    description: str
    level: str
    theme: str
    lessons: List[LessonDto]
    progress: int

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class LearningPathDto(BaseModel):
    language: str
    user_level: str
    modules: List[ModuleDto]

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
