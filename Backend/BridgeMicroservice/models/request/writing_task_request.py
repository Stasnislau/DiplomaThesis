from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Optional


class WritingTaskRequest(BaseModel):
    language: str
    level: str
    topic: Optional[str] = None        # Lesson topic, e.g. "Saying Hello & Goodbye"
    keywords: Optional[List[str]] = None  # Key words/phrases the task should focus on

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
