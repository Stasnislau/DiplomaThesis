from pydantic import BaseModel, ConfigDict
from typing import List
from pydantic.alias_generators import to_camel
from models.dtos.placement_dtos import PlacementTestAnswer

class EvaluatePlacementTestRequest(BaseModel):
    answers: List[PlacementTestAnswer]
    language: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
