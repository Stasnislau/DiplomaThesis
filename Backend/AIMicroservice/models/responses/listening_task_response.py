from typing import List, Literal, Union, Annotated
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


class _ListeningQuestionBase(BaseModel):
    question: str
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class MultipleChoiceQuestion(_ListeningQuestionBase):
    type: Literal["multiple_choice"] = "multiple_choice"
    options: List[str]
    correctAnswer: str


class FillInTheBlankQuestion(_ListeningQuestionBase):
    type: Literal["fill_in_the_blank"] = "fill_in_the_blank"
    correctAnswer: str


class DictationQuestion(_ListeningQuestionBase):

    type: Literal["dictation"] = "dictation"
    correctAnswer: str


class TrueFalseNotGivenQuestion(_ListeningQuestionBase):

    type: Literal["true_false_not_given"] = "true_false_not_given"
    correctAnswer: Literal["true", "false", "not_given"]


class SentenceCompletionQuestion(_ListeningQuestionBase):

    type: Literal["sentence_completion"] = "sentence_completion"
    correctAnswer: Union[str, List[str]]


class SpeakerStatement(BaseModel):
    statement: str
    correctSpeaker: str

    model_config = ConfigDict(populate_by_name=True)


class MultiSpeakerMatchingQuestion(_ListeningQuestionBase):

    type: Literal["multi_speaker_matching"] = "multi_speaker_matching"
    speakers: List[str] = Field(min_length=2)
    statements: List[SpeakerStatement] = Field(min_length=2)


ListeningQuestion = Annotated[
    Union[
        MultipleChoiceQuestion,
        FillInTheBlankQuestion,
        DictationQuestion,
        TrueFalseNotGivenQuestion,
        SentenceCompletionQuestion,
        MultiSpeakerMatchingQuestion,
    ],
    Field(discriminator="type"),
]


ListeningQuestionAdapter: TypeAdapter[ListeningQuestion] = TypeAdapter(ListeningQuestion)


class ListeningTaskResponse(BaseModel):
    type: Literal["listening"]
    audioUrl: str
    transcript: str
    questions: List[ListeningQuestion]
    speakers: List[str] = Field(default_factory=list)
