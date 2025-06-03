from typing import List, Optional, Any
from pydantic import BaseModel

class WhisperWord(BaseModel):
    word: str
    start: Optional[float] = None
    end: Optional[float] = None
    # score: Optional[float] = None # score/confidence per word is not standard in Whisper TranscriptionResponse

class WhisperSegment(BaseModel):
    id: Optional[int] = None
    seek: Optional[int] = None
    start: Optional[float] = None
    end: Optional[float] = None
    text: str
    tokens: Optional[List[int]] = None
    temperature: Optional[float] = None
    avg_logprob: Optional[float] = None
    compression_ratio: Optional[float] = None
    no_speech_prob: Optional[float] = None
    # words: Optional[List[WhisperWord]] = None # verbose_json might provide this, depends on LiteLLM's parsing

class WhisperTranscriptionResult(BaseModel):
    text: str
    language: Optional[str] = None
    segments: Optional[List[WhisperSegment]] = None # If response_format=verbose_json is effectively used
    words: Optional[List[WhisperWord]] = None # If word_timestamps=True is effectively used
    raw_response: Optional[Any] = None # To store the full response if needed for debugging

class IdentifiedError(BaseModel):
    error_type: str # e.g., "Grammar", "Vocabulary", "Phrasing", "Fluency"
    erroneous_text: str
    explanation: str
    suggestion: str

class AIFeedbackResult(BaseModel):
    overall_assessment: str
    identified_errors: List[IdentifiedError]
    positive_points: Optional[List[str]] = None
    areas_for_improvement: Optional[List[str]] = None
