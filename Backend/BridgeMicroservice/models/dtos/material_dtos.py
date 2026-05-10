from typing import List, Union, Any, Dict, Optional, Annotated, Literal
from pydantic import BaseModel, Field, ConfigDict, TypeAdapter


class ChunkMetadata(BaseModel):
    source: str
    chunk_index: int


class QuestionTypeExample(BaseModel):
    type: str
    example: str


class DocumentExercise(BaseModel):
    """One distinct exercise/activity detected in a source PDF.

    Drives Stage 2 (stimulus generation) and Stage 3 (question
    generation). Fields are optional because not every exercise has
    a passage (e.g. isolated grammar gap-fills don't), and the LLM
    may not always estimate every field.
    """

    type: str
    passage_word_count_estimate: Optional[int] = None
    passage_topic_hint: Optional[str] = None
    passage_excerpt_for_style: Optional[str] = None
    question_count: Optional[int] = None
    question_subtypes: List[str] = Field(default_factory=list)
    grammar_focus: List[str] = Field(default_factory=list)
    example: str = ""


class DocumentMap(BaseModel):
    """Structured plan derived from a PDF — what's in it, how big the
    passages are, what subtypes of questions to drill. Output of the
    Stage 1 classification call; consumed by generate_quiz."""

    document_kind: str = "Mixed"
    exercises: List[DocumentExercise] = Field(default_factory=list)


class ProcessPdfResponse(BaseModel):
    filename: str
    chunks_count: int
    status: str
    analyzed_types: Union[List[QuestionTypeExample], List[Dict[str, Any]]] = Field(
        default_factory=list
    )
    document_map: Optional[DocumentMap] = None


# -----------------------------------------------------------------
# Quiz question variants (Phase 1.7 — discriminated union by `type`).
# -----------------------------------------------------------------
#
# Each subclass defines the exact shape the AI must produce for that
# question type. The shared base captures fields every variant has.
# Pydantic's `discriminator="type"` then routes incoming JSON to the
# right variant at parse time, giving us strict validation without a
# manual switch.
#
# Wire-shape rules (the prompts must echo these):
# - `multiple_choice`:    options[3-4], correct_answer is one of them.
# - `open`:               correct_answer free text, options=[].
# - `fill_in_the_blank`:  question contains "___"; correct_answer is
#                         either a string or a list of accepted variants.
# - `true_false`:         correct_answer is the literal "true" or "false".
# - `matching`:           pairs[] — each {left, right}; "right" is the
#                         canonical correct match for "left".
# - `multi_select_mc`:    options[], correct_answers[] with ≥2 items.
# - `cloze_passage`:      passage_with_blanks contains "{{1}} {{2}} ..."
#                         markers; blanks[] gives id + correct_answer
#                         per marker.


class _QuestionBase(BaseModel):
    question: str
    context_text: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class MultipleChoiceQuizQuestion(_QuestionBase):
    type: Literal["multiple_choice"] = "multiple_choice"
    options: List[str] = Field(default_factory=list)
    correct_answer: str = Field(alias="correct_answer")


class OpenQuizQuestion(_QuestionBase):
    type: Literal["open"] = "open"
    options: List[str] = Field(default_factory=list)
    correct_answer: str = Field(alias="correct_answer", default="")


class FillInTheBlankQuizQuestion(_QuestionBase):
    type: Literal[
        "fill_in_the_blank", "gap_fill_grammar", "gap_fill_vocab"
    ] = "fill_in_the_blank"
    options: List[str] = Field(default_factory=list)
    correct_answer: Union[str, List[str]] = Field(alias="correct_answer")


class TrueFalseQuizQuestion(_QuestionBase):
    type: Literal["true_false"] = "true_false"
    correct_answer: Literal["true", "false"] = Field(alias="correct_answer")


class MatchingPair(BaseModel):
    left: str
    right: str


class MatchingQuizQuestion(_QuestionBase):
    type: Literal["matching"] = "matching"
    pairs: List[MatchingPair]


class MultiSelectMCQuizQuestion(_QuestionBase):
    type: Literal["multi_select_mc"] = "multi_select_mc"
    options: List[str]
    correct_answers: List[str] = Field(min_length=2)


class ClozeBlank(BaseModel):
    id: str
    correct_answer: Union[str, List[str]] = Field(alias="correct_answer")

    model_config = ConfigDict(populate_by_name=True)


class ClozePassageQuizQuestion(_QuestionBase):
    type: Literal["cloze_passage"] = "cloze_passage"
    passage_with_blanks: str
    blanks: List[ClozeBlank]


QuizQuestion = Annotated[
    Union[
        MultipleChoiceQuizQuestion,
        OpenQuizQuestion,
        FillInTheBlankQuizQuestion,
        TrueFalseQuizQuestion,
        MatchingQuizQuestion,
        MultiSelectMCQuizQuestion,
        ClozePassageQuizQuestion,
    ],
    Field(discriminator="type"),
]


# Single-question parser the service uses to validate each item the AI
# returns and route it to the correct variant.
QuizQuestionAdapter: TypeAdapter[QuizQuestion] = TypeAdapter(QuizQuestion)


class QuizContent(BaseModel):
    questions: List[QuizQuestion]

    model_config = ConfigDict(populate_by_name=True)


class GenerateQuizResponse(BaseModel):
    quiz: Union[QuizContent, str]
