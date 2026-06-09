from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class PlacementAnswer(BaseModel):
    is_correct: bool

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class PlacementTestAnswer(BaseModel):
    question: str
    user_answer: str
    is_correct: bool

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
