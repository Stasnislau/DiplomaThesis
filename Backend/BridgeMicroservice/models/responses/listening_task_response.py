from typing import List, Literal, Union, Annotated
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


# -----------------------------------------------------------------
# Listening question variants — discriminated union by `type`.
#
# Wire shape mirrors what the LLM is told to output in
# Backend/BridgeMicroservice/services/listening_task_service.py.
# Frontend (Frontend/src/api/mutations/createListeningTask.ts +
# pages/Tasks/components/ListeningRenderers/) dispatches on `type`.
#
# Naming kept camelCase on the wire to match the existing
# `correctAnswer` convention from the original two variants — moving
# to snake_case here would break every old client mid-flight.
# -----------------------------------------------------------------


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
    """User listens to a short clip and types it back verbatim.
    `correctAnswer` is the canonical written form; grading is
    case-insensitive trim-tolerant."""

    type: Literal["dictation"] = "dictation"
    correctAnswer: str


class TrueFalseNotGivenQuestion(_ListeningQuestionBase):
    """IELTS-style. Statement is either confirmed by the audio,
    contradicted by it, or never addressed (`not_given`)."""

    type: Literal["true_false_not_given"] = "true_false_not_given"
    correctAnswer: Literal["true", "false", "not_given"]


class SentenceCompletionQuestion(_ListeningQuestionBase):
    """TOEFL-style sentence completion. The `question` carries an
    incomplete sentence with `___` marking the slot. `correctAnswer`
    is the missing word/phrase or a list of accepted variants."""

    type: Literal["sentence_completion"] = "sentence_completion"
    correctAnswer: Union[str, List[str]]


class SpeakerStatement(BaseModel):
    statement: str
    correctSpeaker: str

    model_config = ConfigDict(populate_by_name=True)


class MultiSpeakerMatchingQuestion(_ListeningQuestionBase):
    """Audio has multiple speakers (TTS uses different voices per
    `[Speaker N]:` block). User must attribute each statement to its
    speaker."""

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
    # Tags identifying which speakers were synthesised in the audio.
    # Empty / single-entry list for monologue tasks; populated when a
    # multi_speaker_matching question is in the set so the FE can
    # render speaker chips alongside the audio player.
    speakers: List[str] = Field(default_factory=list)
