from pydantic import BaseModel
from typing import List

class EvaluateTestDto(BaseModel):
    level: str
    confidence: float
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str


