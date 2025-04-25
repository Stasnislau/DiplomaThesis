from pydantic import BaseModel
from typing import Literal, List, Optional

class TaskDto(BaseModel):
    id: str
    type: Literal["multiple_choice", "fill_in_the_blank"]
    question: str
    description: Optional[str] = None


class MultipleChoiceTask(TaskDto):
    type: Literal["multiple_choice"]
    options: List[str]
    correctAnswer: str


class FillInTheBlankTask(TaskDto):
    type: Literal["fill_in_the_blank"]
    correctAnswer: str
