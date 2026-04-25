from pydantic import BaseModel, ConfigDict, field_validator, model_validator
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

    @model_validator(mode="before")
    @classmethod
    def coerce_index_to_option(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        answer_key = "correctAnswer" if "correctAnswer" in data else "correct_answer"
        answer = data.get(answer_key)
        options = data.get("options", [])
        if isinstance(answer, bool):
            return data
        if isinstance(answer, int) and isinstance(options, list) and 0 <= answer < len(options):
            data[answer_key] = options[answer]
        elif isinstance(answer, list):
            normalised = []
            for item in answer:
                if isinstance(item, int) and isinstance(options, list) and 0 <= item < len(options):
                    normalised.append(options[item])
                else:
                    normalised.append(item)
            data[answer_key] = normalised
        return data

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class FillInTheBlankTask(TaskDto):
    type: Literal["fill_in_the_blank"]
    correct_answer: List[str]

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

