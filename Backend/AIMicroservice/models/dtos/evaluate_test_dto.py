from pydantic import BaseModel, ConfigDict
from typing import List
from pydantic.alias_generators import to_camel

class EvaluateTestDto(BaseModel):
    level: str
    confidence: float
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )



