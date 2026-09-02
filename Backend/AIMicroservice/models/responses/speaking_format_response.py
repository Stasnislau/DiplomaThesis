
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

from models.responses.speaking_analysis_response import (
    IdentifiedError,
    PronunciationMetrics,
)


SpeakingFormat = Literal[
    "read_aloud",
    "timed_response",
    "repeat_after_me",
    "picture_description",
    "free_monologue",
]


class SpeakingPromptRequest(BaseModel):
    language: str
    level: str
    format: SpeakingFormat = "timed_response"

    model_config = ConfigDict(populate_by_name=True)


class SpeakingPromptResponse(BaseModel):

    format: SpeakingFormat
    prompt: str
    translation: str = ""
    audioUrl: Optional[str] = None
    targetPhrase: Optional[str] = None
    imageUrl: Optional[str] = None
    durationSeconds: int = 30
    rubricHints: List[str] = Field(default_factory=list)
    targetedWeaknesses: List[str] = Field(default_factory=list)
    derivedFromHistory: bool = False


class SpeakingGradeResponse(BaseModel):

    format: SpeakingFormat
    transcription: str
    detectedLanguage: Optional[str] = None
    overallAssessment: str
    positivePoints: List[str] = Field(default_factory=list)
    areasForImprovement: List[str] = Field(default_factory=list)
    identifiedErrors: List[IdentifiedError] = Field(default_factory=list)
    pronunciation: PronunciationMetrics

    contentScore: Optional[int] = None
    coherenceScore: Optional[int] = None
    vocabularyScore: Optional[int] = None
    wordErrorRate: Optional[float] = None
    matchPercent: Optional[float] = None


FORMAT_DEFAULT_DURATION: dict = {
    "read_aloud": 20,
    "timed_response": 30,
    "repeat_after_me": 15,
    "picture_description": 60,
    "free_monologue": 90,
}


FORMAT_RUBRIC_HINTS: dict = {
    "read_aloud": ["pronunciation accuracy", "fluency"],
    "timed_response": ["task achievement", "grammar accuracy", "vocabulary range"],
    "repeat_after_me": ["pronunciation accuracy", "intonation", "match to target"],
    "picture_description": [
        "vocabulary range",
        "descriptive detail",
        "sentence variety",
        "coherence",
    ],
    "free_monologue": [
        "coherence and cohesion",
        "discourse markers",
        "vocabulary range",
        "grammatical range",
    ],
}


def is_known_format(value: str) -> bool:
    return value in {
        "read_aloud",
        "timed_response",
        "repeat_after_me",
        "picture_description",
        "free_monologue",
    }
