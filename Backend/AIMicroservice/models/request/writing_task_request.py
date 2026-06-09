from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Optional


class WritingTaskRequest(BaseModel):
    language: str
    level: str
    topic: Optional[str] = None
    keywords: Optional[List[str]] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
