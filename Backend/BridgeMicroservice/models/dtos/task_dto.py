from pydantic import BaseModel, ConfigDict, field_validator
from typing import Literal, List, Optional, Union
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
    correct_answer: Union[str, List[str]]

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class FillInTheBlankTask(TaskDto):
    type: Literal["fill_in_the_blank"]
    # Always a list — supports synonyms / multiple accepted answers
    correct_answer: List[str]

    # Normalise: str → [str], list stays as-is
    @field_validator("correct_answer", mode="before")
    @classmethod
    def normalise_to_list(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [v]
        return v if v else []

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

