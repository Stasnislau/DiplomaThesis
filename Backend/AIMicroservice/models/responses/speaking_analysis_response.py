from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Optional


class IdentifiedError(BaseModel):
    """A single language error identified in the transcription."""
    error_type: str = Field(
        ..., description="Type of error: Grammar, Vocabulary, Phrasing, Fluency"
    )
    erroneous_text: str = Field(
        ..., description="The specific text segment containing the error"
    )
    explanation: str = Field(
        ..., description="Why this is an error"
    )
    suggestion: str = Field(
        ..., description="Corrected version or suggestion"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class PronunciationMetrics(BaseModel):
    """Pronunciation quality metrics derived from Whisper confidence scores."""
    overall_confidence: float = Field(
        ..., description="Average transcription confidence (0-1). Higher = clearer pronunciation"
    )
    words_per_minute: Optional[float] = Field(
        None, description="Speaking rate in words per minute"
    )
    avg_pause_duration: Optional[float] = Field(
        None, description="Average pause duration between words in seconds"
    )
    low_confidence_words: List[str] = Field(
        default_factory=list,
        description="Words where Whisper had low confidence (possible pronunciation issues)"
    )
    fluency_score: float = Field(
        ..., description="Fluency score (0-100) based on pace, pauses, and confidence"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class SpeakingAnalysisResponse(BaseModel):
    """Structured response for speaking analysis with transcription, errors, and pronunciation metrics."""
    transcription: str = Field(
        ..., description="Full transcribed text from the audio"
    )
    detected_language: Optional[str] = Field(
        None, description="Language detected by Whisper"
    )
    overall_assessment: str = Field(
        ..., description="Brief summary of the user's language proficiency"
    )
    identified_errors: List[IdentifiedError] = Field(
        default_factory=list, description="List of identified language errors"
    )
    positive_points: List[str] = Field(
        default_factory=list, description="Things the user did well"
    )
    areas_for_improvement: List[str] = Field(
        default_factory=list, description="General areas to focus on"
    )
    pronunciation: PronunciationMetrics = Field(
        ..., description="Pronunciation quality metrics"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )
