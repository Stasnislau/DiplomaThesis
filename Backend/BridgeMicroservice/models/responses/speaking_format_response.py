"""DTOs for the format-driven speaking flow (Phase 3).

Four practice formats sit on top of the existing speaking pipeline:

  - read_aloud           — historic single-sentence pronunciation drill.
  - timed_response       — LLM asks a question; user answers within ~30s.
  - repeat_after_me      — TTS reads a phrase; user repeats it; we grade
                           by word-error-rate against the canonical text.
  - picture_description  — LLM gives a scene/situation; user describes
                           it for 30-60s.
  - free_monologue       — topic + ~60-120s monologue, focus on
                           coherence and discourse markers.
"""

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
    """What the FE renders so the user knows what to record.

    Optional fields are populated per-format:
      - `audioUrl` and `targetPhrase` only for `repeat_after_me`.
      - `translation` populated when the prompt is in the target
        language and a UI-locale gloss helps comprehension.
      - `rubricHints` populated for content-graded formats so the
        learner knows what they're scored on before they speak.
    """

    format: SpeakingFormat
    prompt: str
    translation: str = ""
    audioUrl: Optional[str] = None
    targetPhrase: Optional[str] = None
    durationSeconds: int = 30
    rubricHints: List[str] = Field(default_factory=list)
    targetedWeaknesses: List[str] = Field(default_factory=list)
    derivedFromHistory: bool = False


class SpeakingGradeResponse(BaseModel):
    """Grading verdict shape — superset of the legacy SpeakingAnalysisResponse
    so existing consumers keep working, with format-specific scores
    layered on top."""

    format: SpeakingFormat
    transcription: str
    detectedLanguage: Optional[str] = None
    overallAssessment: str
    positivePoints: List[str] = Field(default_factory=list)
    areasForImprovement: List[str] = Field(default_factory=list)
    identifiedErrors: List[IdentifiedError] = Field(default_factory=list)
    pronunciation: PronunciationMetrics

    # Format-specific scores (0-100). Each is optional; only the
    # subset the format uses is populated.
    contentScore: Optional[int] = None       # timed_response, picture, monologue
    coherenceScore: Optional[int] = None     # picture, monologue
    vocabularyScore: Optional[int] = None    # picture, monologue
    wordErrorRate: Optional[float] = None    # repeat_after_me (0-1, lower = better)
    matchPercent: Optional[float] = None     # repeat_after_me (0-100, higher = better)


# Default duration per format. Used when the request doesn't override.
FORMAT_DEFAULT_DURATION: dict = {
    "read_aloud": 20,
    "timed_response": 30,
    "repeat_after_me": 15,
    "picture_description": 60,
    "free_monologue": 90,
}


# Rubric hints baked into prompts and surfaced to the FE so the
# learner knows what they're being graded on before they speak.
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
    """Lightweight runtime check used by controllers when the format
    arrives as an arbitrary query string instead of a Literal."""
    return value in {
        "read_aloud",
        "timed_response",
        "repeat_after_me",
        "picture_description",
        "free_monologue",
    }
