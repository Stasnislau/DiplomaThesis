from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import List, Literal, Optional


class EssayTask(BaseModel):
    """A generated essay prompt — what the learner sees before they start writing."""

    id: str
    type: Literal["essay"] = "essay"
    topic: str
    instructions: List[str] = Field(default_factory=list)
    rubric_hints: List[str] = Field(default_factory=list)
    word_count_target: int

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class EssayEvaluation(BaseModel):
    """The graded result returned after the learner submits their essay."""

    score: int
    passed: bool
    summary: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    word_count: Optional[int] = None
    word_count_target: Optional[int] = None

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )
