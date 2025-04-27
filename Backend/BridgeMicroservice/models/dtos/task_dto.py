from pydantic import BaseModel, ConfigDict
from typing import Literal, List, Optional
from pydantic.alias_generators import to_camel


class TaskDto(BaseModel):
    id: str
    type: Literal["multiple_choice", "fill_in_the_blank"]
    question: str
    description: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class MultipleChoiceTask(TaskDto):
    type: Literal["multiple_choice"]
    options: List[str]
    correct_answer: str

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class FillInTheBlankTask(TaskDto):
    type: Literal["fill_in_the_blank"]
    correct_answer: str

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )
