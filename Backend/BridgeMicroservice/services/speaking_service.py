import json
import io
import whisper
import asyncio
import numpy as np
import logging
from pydub import AudioSegment
from typing import Optional, Any, List

from fastapi import HTTPException
from dotenv import load_dotenv

from .ai_service import AI_Service
from utils.user_context import UserContext
from models.dtos.speaking_analysis_dtos import WhisperTranscriptionResult, WhisperSegment, WhisperWord
from models.responses.speaking_analysis_response import (
    SpeakingAnalysisResponse,
    IdentifiedError,
    PronunciationMetrics,
)
from utils.convert_to_language_code import convert_to_language_code

load_dotenv()

logger = logging.getLogger("bridge_microservice")

# Lazy loading of Whisper model
_whisper_model = None


def get_whisper_model() -> Any:
    global _whisper_model
    if _whisper_model is None:
        logger.info("Loading Whisper model...")
        try:
            _whisper_model = whisper.load_model("turbo")
        except Exception as e:
            logger.error(f"Error loading Whisper model: {e}")
            raise e
    return _whisper_model


class SpeakingService:
    def __init__(self, ai_service: AI_Service):
        self.ai_service = ai_service

    async def _transcribe_audio_with_whisper(
        self, audio_file_bytes: bytes, filename: str, language_code: str
    ) -> WhisperTranscriptionResult:
        model = get_whisper_model()
        if not model:
            raise HTTPException(status_code=500, detail="Whisper model is not loaded.")

        try:
            audio = AudioSegment.from_file(io.BytesIO(audio_file_bytes))
            audio = audio.set_channels(1).set_frame_rate(16000)
            samples = np.array(audio.get_array_of_samples()).astype(np.float32) / 32768.0

            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: model.transcribe(
                    samples,
                    language=language_code,
                    fp16=False,  # CPU does not support FP16
                    word_timestamps=True,
                ),
            )

            logger.debug("Whisper transcription response received")

            transcribed_text = response.get("text", "")
            language = response.get("language")

            segments_data = response.get("segments", [])

            parsed_words: List[WhisperWord] = []
            parsed_segments: List[WhisperSegment] = []

            if segments_data and isinstance(segments_data, list):
                for seg_data in segments_data:
                    if isinstance(seg_data, dict):
                        segment_words_data = seg_data.get("words", [])
                        if segment_words_data and isinstance(segment_words_data, list):
                            parsed_words.extend(
                                [WhisperWord(**word) for word in segment_words_data if isinstance(word, dict)]
                            )

                        seg_data_copy = {k: v for k, v in seg_data.items() if k != "words"}
                        parsed_segments.append(WhisperSegment(**seg_data_copy))

            return WhisperTranscriptionResult(
                text=transcribed_text,
                language=language,
                segments=parsed_segments,
                words=parsed_words,
                raw_response=response,
            )

        except Exception as e:
            logger.error(f"Error during local Whisper transcription (using filename {filename}): {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to transcribe audio locally. Error: {str(e)}",
            )

    def _compute_pronunciation_metrics(
        self, transcription: WhisperTranscriptionResult
    ) -> PronunciationMetrics:
        """Extract pronunciation quality metrics from Whisper's output."""
        segments = transcription.segments or []
        words = transcription.words or []

        # --- Overall confidence from segment avg_logprob ---
        logprobs = [s.avg_logprob for s in segments if s.avg_logprob is not None]
        if logprobs:
            # avg_logprob is typically between -1.0 (bad) and 0.0 (perfect)
            # Convert to 0-1 scale: confidence = 1 + avg_logprob (clamped)
            avg_logprob = sum(logprobs) / len(logprobs)
            overall_confidence = round(max(0.0, min(1.0, 1.0 + avg_logprob)), 3)
        else:
            overall_confidence = 0.5  # fallback

        # --- Words per minute ---
        words_per_minute: Optional[float] = None
        if words and len(words) >= 2:
            first_word = words[0]
            last_word = words[-1]
            if first_word.start is not None and last_word.end is not None:
                duration_seconds = last_word.end - first_word.start
                if duration_seconds > 0:
                    words_per_minute = round((len(words) / duration_seconds) * 60, 1)

        # --- Average pause duration between words ---
        avg_pause: Optional[float] = None
        pauses: List[float] = []
        for i in range(1, len(words)):
            prev_end = words[i - 1].end
            curr_start = words[i].start
            if prev_end is not None and curr_start is not None:
                gap = curr_start - prev_end
                if gap > 0.05:  # ignore tiny gaps (< 50ms)
                    pauses.append(gap)
        if pauses:
            avg_pause = round(sum(pauses) / len(pauses), 3)

        # --- Low confidence words ---
        # Use segment-level confidence to flag words from low-confidence segments
        low_conf_segment_ids = set()
        for seg in segments:
            if seg.avg_logprob is not None and seg.avg_logprob < -0.7:
                if seg.id is not None:
                    low_conf_segment_ids.add(seg.id)

        low_confidence_words: List[str] = []
        if low_conf_segment_ids and segments:
            for seg in segments:
                if seg.id in low_conf_segment_ids:
                    # Get individual words from this segment's text
                    seg_words = seg.text.strip().split()
                    low_confidence_words.extend(seg_words[:5])  # cap per segment

        # Also check for high no_speech_prob segments
        for seg in segments:
            if seg.no_speech_prob is not None and seg.no_speech_prob > 0.5:
                logger.debug(f"High no_speech_prob ({seg.no_speech_prob}) in segment: {seg.text[:50]}")

        # --- Fluency score (0-100) ---
        # Composite of confidence, WPM (ideal: 100-160 for most languages), and pause consistency
        fluency = overall_confidence * 50  # confidence contributes 50 points max

        if words_per_minute is not None:
            # Ideal WPM range: 100-160
            if 100 <= words_per_minute <= 160:
                fluency += 30
            elif 80 <= words_per_minute < 100 or 160 < words_per_minute <= 200:
                fluency += 20
            elif 60 <= words_per_minute < 80 or 200 < words_per_minute <= 250:
                fluency += 10
            # else: too slow or too fast, 0 points
        else:
            fluency += 15  # neutral if we can't measure

        if avg_pause is not None:
            if avg_pause < 0.5:
                fluency += 20  # natural pauses
            elif avg_pause < 1.0:
                fluency += 10  # slightly hesitant
            # else: long pauses, 0 points
        else:
            fluency += 10  # neutral

        fluency_score = round(min(100.0, max(0.0, fluency)), 1)

        return PronunciationMetrics(
            overall_confidence=overall_confidence,
            words_per_minute=words_per_minute,
            avg_pause_duration=avg_pause,
            low_confidence_words=low_confidence_words[:10],  # cap at 10
            fluency_score=fluency_score,
        )

    async def _get_ai_feedback(
        self,
        transcription_text: str,
        user_context: Optional[UserContext] = None,
    ) -> dict:
        """Get structured AI feedback on the transcription."""
        prompt = f"""
        The following text was transcribed from an audio recording of a user speaking:
        ---BEGIN TRANSCRIPTION---
        {transcription_text}
        ---END TRANSCRIPTION---

        Analyze this text for language errors (grammar, vocabulary, phrasing, fluency).
        Do NOT focus on pronunciation — only analyze the text content.

        Return your analysis as a JSON object with this EXACT structure:
        {{
          "overall_assessment": "Brief summary of proficiency",
          "identified_errors": [
            {{
              "error_type": "Grammar|Vocabulary|Phrasing|Fluency",
              "erroneous_text": "the problematic text",
              "explanation": "why it's wrong",
              "suggestion": "corrected version"
            }}
          ],
          "positive_points": ["good things about the speech"],
          "areas_for_improvement": ["what to work on"]
        }}

        Rules:
        - Keep identified_errors to the 10 most important errors maximum
        - Keep explanations concise (1-2 sentences each)
        - If no errors found, return an empty identified_errors list
        - Ensure output is valid JSON
        """
        try:
            ai_response_str = await self.ai_service.get_ai_response(
                prompt=prompt, user_context=user_context
            )
            return json.loads(ai_response_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI feedback JSON: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse AI feedback into expected JSON structure.",
            )
        except Exception as e:
            logger.error(f"Error getting AI feedback: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get AI feedback: {str(e)}",
            )

    async def analyze_user_audio(
        self,
        audio_file_bytes: bytes,
        filename: Optional[str] = None,
        language: Optional[str] = None,
        user_context: Optional[UserContext] = None,
    ) -> SpeakingAnalysisResponse:
        logger.info(f"Received audio file of size: {len(audio_file_bytes)} bytes for analysis.")
        if not audio_file_bytes:
            raise HTTPException(status_code=400, detail="No audio file provided.")

        effective_filename = filename if filename else "recording.webm"
        language_code = convert_to_language_code(language) if language else "en"

        # Step 1: Transcribe with Whisper
        transcription = await self._transcribe_audio_with_whisper(
            audio_file_bytes, effective_filename, language_code
        )
        logger.info(f"Transcription completed: {transcription.text[:100]}...")

        if not transcription.text.strip():
            return SpeakingAnalysisResponse(
                transcription="",
                detected_language=transcription.language,
                overall_assessment="Could not transcribe any speech from the audio. Please try again with clearer audio.",
                identified_errors=[],
                positive_points=[],
                areas_for_improvement=["Ensure clear audio recording with minimal background noise"],
                pronunciation=PronunciationMetrics(
                    overall_confidence=0.0,
                    fluency_score=0.0,
                ),
            )

        # Step 2: Compute pronunciation metrics from Whisper data
        pronunciation = self._compute_pronunciation_metrics(transcription)
        logger.info(f"Pronunciation metrics: confidence={pronunciation.overall_confidence}, fluency={pronunciation.fluency_score}")

        # Step 3: Get AI feedback on text content
        ai_feedback = await self._get_ai_feedback(
            transcription.text, user_context=user_context
        )
        logger.info("AI feedback received successfully")

        # Step 4: Build structured response
        errors = []
        for err_data in ai_feedback.get("identified_errors", []):
            try:
                errors.append(IdentifiedError(**err_data))
            except Exception as e:
                logger.warning(f"Skipping malformed error entry: {e}")

        return SpeakingAnalysisResponse(
            transcription=transcription.text.strip(),
            detected_language=transcription.language,
            overall_assessment=ai_feedback.get("overall_assessment", "Analysis complete."),
            identified_errors=errors,
            positive_points=ai_feedback.get("positive_points", []),
            areas_for_improvement=ai_feedback.get("areas_for_improvement", []),
            pronunciation=pronunciation,
        )
