from typing import List, Literal, Union
from pydantic import BaseModel


class MultipleChoiceQuestion(BaseModel):
    type: Literal["multiple_choice"]
    question: str
    options: List[str]
    correctAnswer: str


class FillInTheBlankQuestion(BaseModel):
    type: Literal["fill_in_the_blank"]
    question: str
    correctAnswer: str


class ListeningTaskResponse(BaseModel):
    type: Literal["listening"]
    audioUrl: str
    transcript: str
    questions: List[Union[MultipleChoiceQuestion, FillInTheBlankQuestion]]
