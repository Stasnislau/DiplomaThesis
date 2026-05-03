import json
import os
import asyncio
import hashlib
import logging
import time
import httpx
from typing import Optional, Any, List, Dict, Tuple

from fastapi import HTTPException
from dotenv import load_dotenv

from .ai_service import AI_Service
from .user_service import UserService
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

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_WHISPER_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")


_SPEAKING_CACHE_TTL = 60 * 60  # 1h
_SPEAKING_CACHE_MAX = 64


class SpeakingService:
    def __init__(self, ai_service: AI_Service):
        self.ai_service = ai_service
        self.user_service = UserService()
        # (cache_key) -> (expires_at, response). cache_key is sha256 of
        # (audio bytes, language, ui_locale) — so re-clicking 'Analyze' on
        # the same recording doesn't bill the provider twice. Tiny LRU,
        # bounded; first cache miss after eviction simply re-pays.
        self._analyze_cache: Dict[str, Tuple[float, "SpeakingAnalysisResponse"]] = {}

    def _cache_key(
        self, audio_bytes: bytes, language: Optional[str], ui_locale: Optional[str]
    ) -> str:
        h = hashlib.sha256()
        h.update(audio_bytes)
        h.update(b"\0")
        h.update((language or "").encode("utf-8"))
        h.update(b"\0")
        h.update((ui_locale or "").encode("utf-8"))
        return h.hexdigest()

    def _cache_get(self, key: str) -> Optional["SpeakingAnalysisResponse"]:
        entry = self._analyze_cache.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if time.time() > expires_at:
            self._analyze_cache.pop(key, None)
            return None
        return value

    def _cache_put(self, key: str, value: "SpeakingAnalysisResponse") -> None:
        if len(self._analyze_cache) >= _SPEAKING_CACHE_MAX:
            # Evict the oldest entry — cheap O(n) on tiny dict, no need
            # for an OrderedDict here.
            oldest = min(self._analyze_cache.items(), key=lambda kv: kv[1][0])[0]
            self._analyze_cache.pop(oldest, None)
        self._analyze_cache[key] = (time.time() + _SPEAKING_CACHE_TTL, value)

    async def _transcribe_audio_with_whisper(
        self, audio_file_bytes: bytes, filename: str, language_code: str
    ) -> WhisperTranscriptionResult:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            from utils.error_codes import SPEAKING_GROQ_KEY_MISSING, raise_with_code
            raise_with_code(
                SPEAKING_GROQ_KEY_MISSING,
                500,
                "GROQ_API_KEY is not configured for speech transcription.",
            )

        ext = (filename or "recording.webm").rsplit(".", 1)[-1].lower()
        content_type_map = {
            "mp4": "audio/mp4",
            "m4a": "audio/mp4",
            "mp3": "audio/mpeg",
            "ogg": "audio/ogg",
            "wav": "audio/wav",
            "webm": "audio/webm",
        }
        content_type = content_type_map.get(ext, "audio/webm")

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    GROQ_TRANSCRIPTION_URL,
                    headers={"Authorization": f"Bearer {api_key}"},
                    files={"file": (filename, audio_file_bytes, content_type)},
                    data={
                        "model": GROQ_WHISPER_MODEL,
                        "language": language_code,
                        "response_format": "verbose_json",
                        "timestamp_granularities[]": "segment",
                    },
                )

            if response.status_code != 200:
                logger.error(
                    f"Groq Whisper transcription failed ({response.status_code}): {response.text}"
                )
                from utils.error_codes import SPEAKING_TRANSCRIBE_PROVIDER_ERROR, raise_with_code
                raise_with_code(
                    SPEAKING_TRANSCRIBE_PROVIDER_ERROR,
                    502,
                    f"Speech transcription provider error: {response.text}",
                )

            payload = response.json()
            transcribed_text = payload.get("text", "")
            language = payload.get("language")

            parsed_words: List[WhisperWord] = []
            parsed_segments: List[WhisperSegment] = []

            for seg_data in payload.get("segments") or []:
                if not isinstance(seg_data, dict):
                    continue
                segment_words = seg_data.get("words", [])
                if isinstance(segment_words, list):
                    parsed_words.extend(
                        WhisperWord(**word)
                        for word in segment_words
                        if isinstance(word, dict)
                    )
                seg_copy = {k: v for k, v in seg_data.items() if k != "words"}
                parsed_segments.append(WhisperSegment(**seg_copy))

            for word in payload.get("words") or []:
                if isinstance(word, dict):
                    parsed_words.append(WhisperWord(**word))

            return WhisperTranscriptionResult(
                text=transcribed_text,
                language=language,
                segments=parsed_segments,
                words=parsed_words,
                raw_response=payload,
            )

        except HTTPException:
            raise
        except Exception as e:
            from utils.error_codes import SPEAKING_TRANSCRIBE_FAILED, raise_with_code
            logger.error(f"Error during Groq Whisper transcription ({filename}): {e}")
            raise_with_code(
                SPEAKING_TRANSCRIBE_FAILED,
                500,
                f"Failed to transcribe audio. Error: {str(e)}",
            )

    def _compute_pronunciation_metrics(
        self, transcription: WhisperTranscriptionResult
    ) -> PronunciationMetrics:
        """Extract pronunciation quality metrics from Whisper's output."""
        segments = transcription.segments or []
        words = transcription.words or []

        logprobs = [s.avg_logprob for s in segments if s.avg_logprob is not None]
        if logprobs:
            avg_logprob = sum(logprobs) / len(logprobs)
            overall_confidence = round(max(0.0, min(1.0, 1.0 + avg_logprob)), 3)
        else:
            overall_confidence = 0.5

        words_per_minute: Optional[float] = None
        if words and len(words) >= 2:
            first_word = words[0]
            last_word = words[-1]
            if first_word.start is not None and last_word.end is not None:
                duration_seconds = last_word.end - first_word.start
                if duration_seconds > 0:
                    words_per_minute = round((len(words) / duration_seconds) * 60, 1)

        avg_pause: float = 0.0
        pauses: List[float] = []
        for i in range(1, len(words)):
            prev_end = words[i - 1].end
            curr_start = words[i].start
            if prev_end is not None and curr_start is not None:
                gap = curr_start - prev_end
                if gap > 0.05:
                    pauses.append(gap)
        if pauses:
            avg_pause = round(sum(pauses) / len(pauses), 3)
        low_conf_segment_ids = set()
        for seg in segments:
            if seg.avg_logprob is not None and seg.avg_logprob < -0.7:
                if seg.id is not None:
                    low_conf_segment_ids.add(seg.id)

        low_confidence_words: List[str] = []
        if low_conf_segment_ids and segments:
            for seg in segments:
                if seg.id in low_conf_segment_ids:
                    seg_words = seg.text.strip().split()
                    low_confidence_words.extend(seg_words[:5])

        for seg in segments:
            if seg.no_speech_prob is not None and seg.no_speech_prob > 0.5:
                logger.debug(f"High no_speech_prob ({seg.no_speech_prob}) in segment: {seg.text[:50]}")

        fluency = overall_confidence * 50

        if words_per_minute is not None:
            if 100 <= words_per_minute <= 160:
                fluency += 30
            elif 80 <= words_per_minute < 100 or 160 < words_per_minute <= 200:
                fluency += 20
            elif 60 <= words_per_minute < 80 or 200 < words_per_minute <= 250:
                fluency += 10
        else:
            fluency += 15

        if avg_pause is not None:
            if avg_pause < 0.5:
                fluency += 20
            elif avg_pause < 1.0:
                fluency += 10
        else:
            fluency += 10

        fluency_score = round(min(100.0, max(0.0, fluency)), 1)

        return PronunciationMetrics(
            overall_confidence=overall_confidence,
            words_per_minute=words_per_minute,
            avg_pause_duration=avg_pause,
            low_confidence_words=low_confidence_words[:10],
            fluency_score=fluency_score,
        )

    async def _get_ai_feedback(
        self,
        transcription_text: str,
        user_context: Optional[UserContext] = None,
        ui_locale: Optional[str] = None,
        spoken_language: Optional[str] = None,
    ) -> dict:
        """Get structured AI feedback on the transcription.

        ui_locale: language to write the human-readable strings in (assessment,
        explanations, suggestions). Defaults to English.
        spoken_language: the language the user was speaking — analysis is
        constrained to errors in THAT language, not against English defaults.
        """
        locale_label_map = {
            "en": "English",
            "pl": "Polish",
            "es": "Spanish",
            "ru": "Russian",
            "fr": "French",
            "de": "German",
            "it": "Italian",
        }
        feedback_lang = locale_label_map.get(
            (ui_locale or "en").split("-")[0].lower(), "English"
        )
        spoken_lang_clause = (
            f"The user was speaking {spoken_language}. "
            "Evaluate ONLY against the norms of that language. "
            "Do NOT flag perfectly natural phrasing as an error just because a more formal "
            "rephrase exists."
        ) if spoken_language else ""

        prompt = f"""
        Below is a transcription of a casual, spoken language sample.
        {spoken_lang_clause}

        ---BEGIN TRANSCRIPTION---
        {transcription_text}
        ---END TRANSCRIPTION---

        Be a SUPPORTIVE teacher, not a pedant. Spoken language is naturally less formal
        than written language. Apply these strict thresholds before flagging anything:

        1. Only flag errors that are objectively WRONG — broken grammar, wrong word, missing
           required morphology, ungrammatical word order. Stylistic preferences, optional
           rephrases and "could-be-shorter" suggestions are NOT errors.
        2. Filler words ("ну", "так", "you know", "tipo", "no?") are normal in speech, not errors.
        3. False starts and self-corrections are normal in speech, not errors.
        4. Repetition is only an error if it produces a genuinely ungrammatical result.
        5. Do not transliterate or "fix" code-switching unless it produces ungrammatical output.
        6. If the speaker's intent is clearly understood and the sentence is grammatical,
           return zero errors for that sentence.

        Return your analysis as a JSON object with this EXACT structure:
        {{
          "overall_assessment": "<1–2 sentences>",
          "identified_errors": [
            {{
              "error_type": "Grammar|Vocabulary|Phrasing|Fluency",
              "erroneous_text": "the problematic fragment, copied verbatim from the transcription",
              "explanation": "what is broken (1 sentence)",
              "suggestion": "corrected version"
            }}
          ],
          "positive_points": ["concrete things the speaker did well"],
          "areas_for_improvement": ["1–3 high-leverage areas, no nitpicks"]
        }}

        Hard rules:
        - identified_errors length: 0 to 5. Prefer 0 if the speech is grammatical.
        - All human-readable strings (overall_assessment, explanation, suggestion,
          positive_points, areas_for_improvement) must be written in {feedback_lang}.
        - error_type stays in English: one of Grammar, Vocabulary, Phrasing, Fluency.
        - Output valid JSON. No prose before or after.
        """
        try:
            ai_response_str = await self.ai_service.get_ai_response(
                prompt=prompt, user_context=user_context
            )
            return json.loads(ai_response_str)
        except json.JSONDecodeError as e:
            from utils.error_codes import SPEAKING_FEEDBACK_PARSE_FAILED, raise_with_code
            logger.error(f"Failed to parse AI feedback JSON: {e}")
            raise_with_code(
                SPEAKING_FEEDBACK_PARSE_FAILED,
                500,
                "Failed to parse AI feedback into expected JSON structure.",
            )
        except HTTPException:
            raise
        except Exception as e:
            from utils.error_codes import SPEAKING_FEEDBACK_FAILED, raise_with_code
            logger.error(f"Error getting AI feedback: {e}")
            raise_with_code(
                SPEAKING_FEEDBACK_FAILED,
                500,
                f"Failed to get AI feedback: {str(e)}",
            )

    async def analyze_user_audio(
        self,
        audio_file_bytes: bytes,
        filename: Optional[str] = None,
        language: Optional[str] = None,
        user_context: Optional[UserContext] = None,
        ui_locale: Optional[str] = None,
    ) -> SpeakingAnalysisResponse:
        logger.info(f"Received audio file of size: {len(audio_file_bytes)} bytes for analysis.")
        if not audio_file_bytes:
            from utils.error_codes import SPEAKING_NO_AUDIO, raise_with_code
            raise_with_code(SPEAKING_NO_AUDIO, 400, "No audio file provided.")

        effective_filename = filename if filename else "recording.webm"
        language_code = convert_to_language_code(language) if language else "en"

        cache_key = self._cache_key(audio_file_bytes, language, ui_locale)
        cached = self._cache_get(cache_key)
        if cached is not None:
            logger.info("speaking analysis cache hit")
            return cached

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

        pronunciation = self._compute_pronunciation_metrics(transcription)
        logger.info(f"Pronunciation metrics: confidence={pronunciation.overall_confidence}, fluency={pronunciation.fluency_score}")

        # Guard: if Whisper itself is unsure about what was said, the
        # downstream AI 'language analysis' is just hallucinating errors
        # against garbage transcription. Short-circuit with a clear
        # message instead of charging the user's API key for noise.
        if pronunciation.overall_confidence < 0.4:
            logger.info(
                "Skipping AI feedback — overall_confidence=%.2f below threshold",
                pronunciation.overall_confidence,
            )
            return SpeakingAnalysisResponse(
                transcription=transcription.text.strip(),
                detected_language=transcription.language,
                overall_assessment=(
                    "The audio was too unclear to analyse reliably. "
                    "Re-record in a quieter environment, closer to the mic, "
                    "and speak a few full sentences."
                ),
                identified_errors=[],
                positive_points=[],
                areas_for_improvement=[
                    "Reduce background noise.",
                    "Move closer to the microphone.",
                    "Aim for 15–60 seconds of continuous speech.",
                ],
                pronunciation=pronunciation,
            )

        ai_feedback = await self._get_ai_feedback(
            transcription.text,
            user_context=user_context,
            ui_locale=ui_locale,
            spoken_language=language,
        )
        logger.info("AI feedback received successfully")
        errors = []
        for err_data in ai_feedback.get("identified_errors", []):
            try:
                errors.append(IdentifiedError(**err_data))
            except Exception as e:
                logger.warning(f"Skipping malformed error entry: {e}")

        result = SpeakingAnalysisResponse(
            transcription=transcription.text.strip(),
            detected_language=transcription.language,
            overall_assessment=ai_feedback.get("overall_assessment", "Analysis complete."),
            identified_errors=errors,
            positive_points=ai_feedback.get("positive_points", []),
            areas_for_improvement=ai_feedback.get("areas_for_improvement", []),
            pronunciation=pronunciation,
        )

        if user_context:
            await self.user_service.log_task_history(
                user_context,
                {
                    "taskType": "speaking",
                    "title": f"Speaking analysis ({language or 'unknown'})",
                    "score": int(round(pronunciation.fluency_score)) if pronunciation else None,
                    "language": (language or "").lower()[:5] or None,
                    "metadata": {
                        "transcriptionPreview": result.transcription[:120],
                        "errorCount": len(errors),
                        "fluencyScore": pronunciation.fluency_score if pronunciation else None,
                        "wpm": pronunciation.words_per_minute if pronunciation else None,
                    },
                },
            )
        self._cache_put(cache_key, result)
        return result
