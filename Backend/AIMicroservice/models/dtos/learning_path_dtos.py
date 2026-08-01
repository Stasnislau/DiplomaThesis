from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class LessonDto(BaseModel):
    id: str
    title: str
    topic: str
    description: str
    status: str
    type: str
    keywords: List[str]
    duration_minutes: int

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
