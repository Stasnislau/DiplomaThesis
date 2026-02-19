from pydantic import BaseModel, ConfigDict
from typing import Optional
from pydantic.alias_generators import to_camel
from models.dtos.placement_dtos import PlacementAnswer

class PlacementTaskRequest(BaseModel):
    language: str
    previous_answer: Optional[PlacementAnswer] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
