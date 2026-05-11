import json
import os
import asyncio
import hashlib
import logging
import re
import time
import uuid
import aiofiles
import httpx
from typing import Optional, Any, List, Dict, Tuple

from fastapi import HTTPException
from dotenv import load_dotenv

from .ai_service import AI_Service
from .image_service import ImageService
from .user_service import UserService
from utils.user_context import UserContext
from models.dtos.speaking_analysis_dtos import WhisperTranscriptionResult, WhisperSegment, WhisperWord
from models.responses.speaking_analysis_response import (
    SpeakingAnalysisResponse,
    IdentifiedError,
    PronunciationMetrics,
)
from models.responses.speaking_format_response import (
    SpeakingPromptResponse,
    SpeakingGradeResponse,
    FORMAT_DEFAULT_DURATION,
    FORMAT_RUBRIC_HINTS,
)
from utils.convert_to_language_code import convert_to_language_code

load_dotenv()

logger = logging.getLogger("bridge_microservice")

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_WHISPER_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")


_SPEAKING_CACHE_TTL = 60 * 60  # 1h
_SPEAKING_CACHE_MAX = 64


class SpeakingService:
    def __init__(
        self,
        ai_service: AI_Service,
        image_service: ImageService | None = None,
    ):
        self.ai_service = ai_service
        self.user_service = UserService()
        # Imagen 3 is the primary renderer for picture-description.
        # If callers don't supply one we spin a default instance —
        # if env vars are missing it silently disables itself and
        # the speaking flow falls back to Pollinations transparently.
        self.image_service = image_service or ImageService()
        # (cache_key) -> (expires_at, response). cache_key is sha256 of
        # (audio bytes, language, ui_locale) — so re-clicking 'Analyze'
        # on the same recording doesn't bill the provider twice.
        self._analyze_cache: Dict[str, Tuple[float, "SpeakingAnalysisResponse"]] = {}

    async def generate_practice_phrase(
        self,
        language: str,
        level: str,
        user_context: Optional[UserContext] = None,
        focus_keywords: Optional[List[str]] = None,
        focus_weaknesses: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Hand the user a single sentence to read aloud, optionally
        targeted at their recent speaking weaknesses. Designed to
        chain into /speaking/analyze: the user records themselves
        saying this sentence, then the analyzer scores it.

        Returns `{phrase, focus, ipaHint?, translation?}`. Phrase is in
        the target language; translation is in the UI language so the
        learner can verify meaning at a glance.
        """
        ui_locale = (
            user_context.ui_locale_label if user_context else "English"
        )
        focus_clause = ""
        if focus_keywords or focus_weaknesses:
            bits: list[str] = []
            if focus_weaknesses:
                bits.append(
                    "areas to drill: " + ", ".join(focus_weaknesses[:3])
                )
            if focus_keywords:
                bits.append(
                    "incorporate these: "
                    + ", ".join(focus_keywords[:5])
                )
            focus_clause = "Use the learner's recent weaknesses — " + "; ".join(bits) + "."

        prompt = f"""
You are a pronunciation coach. Produce ONE short sentence (8–18 words)
in {language} for a {level} learner to read aloud and have analysed.

The sentence MUST:
- Be natural, conversational, and useful in real life.
- Be challenging at the {level} level, not trivial.
- {focus_clause if focus_clause else "Pick a generally useful everyday topic."}

Respond with a single JSON object only, no prose, with these keys:
- "phrase": the sentence in {language}.
- "focus": a 3-7 word note describing what makes the sentence
  practice-worthy (e.g. "past simple irregulars + linking").
- "translation": a translation of "phrase" into {ui_locale}.
""".strip()

        raw = await self.ai_service.get_ai_response(
            prompt, user_context=user_context, temperature=0.6
        )
        import json

        try:
            data = json.loads(raw)
        except Exception:
            # Fall back: treat the raw response as the phrase itself.
            data = {"phrase": raw.strip()[:200], "focus": "", "translation": ""}
        if not isinstance(data, dict) or not data.get("phrase"):
            from utils.error_codes import (
                AI_RESPONSE_PARSE_FAILED,
                raise_with_code,
            )
            raise_with_code(
                AI_RESPONSE_PARSE_FAILED,
                500,
                "Practice-phrase response was not in the expected shape.",
            )
        return {
            "phrase": str(data.get("phrase", "")).strip(),
            "focus": str(data.get("focus", "")).strip(),
            "translation": str(data.get("translation", "")).strip(),
        }

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
            from utils.language_codes import to_iso_language

            # Top-3 most frequent error categories (e.g. "grammar",
            # "vocabulary", "phrasing") become reusable adaptive
            # signals. We also save the raw error list so the speaking
            # practice-phrase generator can pick a specific issue to
            # drill — e.g. "you said 'I don't know nothing'" → drill a
            # phrase on double negation.
            from collections import Counter

            error_categories = Counter(
                (e.error_type or "").strip().lower()
                for e in errors
                if (e.error_type or "").strip()
            )
            top_error_types = [
                etype for etype, _ in error_categories.most_common(3) if etype
            ]
            error_examples = [
                {
                    "type": e.error_type,
                    "text": (e.erroneous_text or "")[:80],
                    "suggestion": (e.suggestion or "")[:80],
                }
                for e in errors[:5]
            ]

            await self.user_service.log_task_history(
                user_context,
                {
                    "taskType": "speaking",
                    "title": f"Speaking analysis ({language or 'unknown'})",
                    "score": int(round(pronunciation.fluency_score)) if pronunciation else None,
                    "language": to_iso_language(language),
                    "metadata": {
                        "transcriptionPreview": result.transcription[:120],
                        "errorCount": len(errors),
                        "errorTypes": top_error_types,
                        "errorExamples": error_examples,
                        "weaknesses": list(
                            ai_feedback.get("areas_for_improvement", [])
                        )[:5],
                        "fluencyScore": pronunciation.fluency_score if pronunciation else None,
                        "wpm": pronunciation.words_per_minute if pronunciation else None,
                    },
                },
            )
        self._cache_put(cache_key, result)
        return result

    # -----------------------------------------------------------------
    # Phase 3 — format-driven speaking flow.
    #
    # generate_speaking_prompt() emits whatever a given format needs to
    # display before the user records (a question, a phrase + TTS, a
    # scene description, a topic). grade_speaking_response() takes the
    # user's recording back, transcribes it, and grades it per-format.
    # -----------------------------------------------------------------

    async def generate_speaking_prompt(
        self,
        language: str,
        level: str,
        format: str,
        user_context: Optional[UserContext] = None,
        focus_keywords: Optional[List[str]] = None,
        focus_weaknesses: Optional[List[str]] = None,
        tts_synthesizer: Optional[Any] = None,
    ) -> SpeakingPromptResponse:
        """Per-format prompt generation.

        `tts_synthesizer` is an optional callable `(text, language, level) -> bytes`.
        Only used by `repeat_after_me` to render the target phrase as
        audio. Injecting it keeps SpeakingService free of a hard
        dependency on TTSService — swappable for tests.
        """
        ui_locale = (
            user_context.ui_locale_label if user_context else "English"
        )
        focus_clause = self._build_focus_clause(focus_keywords, focus_weaknesses)

        if format == "read_aloud":
            phrase_payload = await self.generate_practice_phrase(
                language=language,
                level=level,
                user_context=user_context,
                focus_keywords=focus_keywords,
                focus_weaknesses=focus_weaknesses,
            )
            return SpeakingPromptResponse(
                format="read_aloud",
                prompt=phrase_payload["phrase"],
                translation=_dedupe_translation(
                    phrase_payload["phrase"],
                    phrase_payload.get("translation", ""),
                ),
                durationSeconds=FORMAT_DEFAULT_DURATION["read_aloud"],
                rubricHints=FORMAT_RUBRIC_HINTS["read_aloud"],
            )

        if format == "timed_response":
            prompt = await self._generate_timed_response_prompt(
                language=language,
                level=level,
                ui_locale=ui_locale,
                focus_clause=focus_clause,
                user_context=user_context,
            )
            return SpeakingPromptResponse(
                format="timed_response",
                prompt=prompt["question"],
                translation=_dedupe_translation(
                    prompt["question"], prompt.get("translation", "")
                ),
                durationSeconds=FORMAT_DEFAULT_DURATION["timed_response"],
                rubricHints=FORMAT_RUBRIC_HINTS["timed_response"],
            )

        if format == "repeat_after_me":
            phrase_payload = await self.generate_practice_phrase(
                language=language,
                level=level,
                user_context=user_context,
                focus_keywords=focus_keywords,
                focus_weaknesses=focus_weaknesses,
            )
            phrase = phrase_payload["phrase"]
            audio_url: Optional[str] = None
            if tts_synthesizer is not None:
                # Synthesise the phrase to MP3 and write to the same
                # static/audio directory the listening flow uses, so
                # the FE just plays the URL.
                try:
                    loop = asyncio.get_running_loop()
                    audio_bytes = await loop.run_in_executor(
                        None, tts_synthesizer, phrase, language, level
                    )
                    audio_url = await self._persist_static_audio(audio_bytes)
                except Exception as e:
                    logger.warning(
                        "TTS synthesis for repeat_after_me failed: %s — falling back to text-only.",
                        e,
                    )
            return SpeakingPromptResponse(
                format="repeat_after_me",
                prompt=phrase,
                translation=_dedupe_translation(
                    phrase, phrase_payload.get("translation", "")
                ),
                audioUrl=audio_url,
                targetPhrase=phrase,
                durationSeconds=FORMAT_DEFAULT_DURATION["repeat_after_me"],
                rubricHints=FORMAT_RUBRIC_HINTS["repeat_after_me"],
            )

        if format == "picture_description":
            prompt = await self._generate_picture_description_prompt(
                language=language,
                level=level,
                ui_locale=ui_locale,
                focus_clause=focus_clause,
                user_context=user_context,
            )
            visual_prompt_text = prompt.get("visual_prompt") or prompt["scene"]
            # Primary: Imagen 3 via Vertex AI — sharper scenes, fewer
            # mangled subjects. Falls back to Pollinations on any
            # failure (credentials missing, quota exhausted, network)
            # so the speaking flow never hard-fails on an image issue.
            image_url = await self.image_service.generate(visual_prompt_text)
            if not image_url:
                image_url = _build_pollinations_url(visual_prompt_text)
            scene_text = prompt["scene"]
            translation = _dedupe_translation(scene_text, prompt.get("translation", ""))
            return SpeakingPromptResponse(
                format="picture_description",
                prompt=scene_text,
                translation=translation,
                imageUrl=image_url,
                durationSeconds=FORMAT_DEFAULT_DURATION["picture_description"],
                rubricHints=FORMAT_RUBRIC_HINTS["picture_description"],
            )

        if format == "free_monologue":
            prompt = await self._generate_monologue_prompt(
                language=language,
                level=level,
                ui_locale=ui_locale,
                focus_clause=focus_clause,
                user_context=user_context,
            )
            return SpeakingPromptResponse(
                format="free_monologue",
                prompt=prompt["topic"],
                translation=_dedupe_translation(
                    prompt["topic"], prompt.get("translation", "")
                ),
                durationSeconds=FORMAT_DEFAULT_DURATION["free_monologue"],
                rubricHints=FORMAT_RUBRIC_HINTS["free_monologue"],
            )

        # Defensive — controllers gate on is_known_format(), so we
        # should never get here. Surface a clear error if we do.
        from utils.error_codes import AI_RESPONSE_PARSE_FAILED, raise_with_code

        raise_with_code(
            AI_RESPONSE_PARSE_FAILED,
            400,
            f"Unknown speaking format: {format}",
        )

    async def grade_speaking_response(
        self,
        audio_file_bytes: bytes,
        filename: Optional[str],
        language: str,
        format: str,
        prompt_text: str,
        target_phrase: Optional[str] = None,
        user_context: Optional[UserContext] = None,
        ui_locale: Optional[str] = None,
    ) -> SpeakingGradeResponse:
        """Format-aware grading.

        Pipeline:
          1. Whisper transcribes the recording (shared across formats).
          2. Pronunciation metrics from segment-level confidence.
          3. Per-format rubric: `repeat_after_me` does WER vs target;
             everything else asks the LLM to grade against rubric hints.
        """
        if not audio_file_bytes:
            from utils.error_codes import SPEAKING_NO_AUDIO, raise_with_code
            raise_with_code(SPEAKING_NO_AUDIO, 400, "No audio file provided.")

        effective_filename = filename if filename else "recording.webm"
        language_code = convert_to_language_code(language) if language else "en"

        transcription = await self._transcribe_audio_with_whisper(
            audio_file_bytes, effective_filename, language_code
        )
        pronunciation = self._compute_pronunciation_metrics(transcription)
        transcript_text = transcription.text.strip()

        if not transcript_text:
            return SpeakingGradeResponse(
                format=format,  # type: ignore[arg-type]
                transcription="",
                detectedLanguage=transcription.language,
                overallAssessment=(
                    "Could not transcribe any speech from the audio. "
                    "Please re-record."
                ),
                pronunciation=PronunciationMetrics(
                    overall_confidence=0.0, fluency_score=0.0
                ),
            )

        # repeat_after_me has its own deterministic grading path —
        # the LLM contributes nothing useful when the target is fixed.
        if format == "repeat_after_me" and target_phrase:
            wer = _word_error_rate(target_phrase, transcript_text)
            match_pct = round(max(0.0, min(1.0, 1.0 - wer)) * 100, 1)
            assessment = (
                "Excellent match!"
                if match_pct >= 90
                else "Close, with a few differences."
                if match_pct >= 70
                else "Notable differences from the target — practise the highlighted words."
            )
            response = SpeakingGradeResponse(
                format="repeat_after_me",
                transcription=transcript_text,
                detectedLanguage=transcription.language,
                overallAssessment=assessment,
                pronunciation=pronunciation,
                wordErrorRate=round(wer, 3),
                matchPercent=match_pct,
            )
            await self._log_grade_to_history(
                user_context=user_context,
                language=language,
                format=format,
                response=response,
            )
            return response

        # Content-graded formats — delegate to the LLM with
        # format-specific rubric hints.
        rubric_hints = FORMAT_RUBRIC_HINTS.get(format, [])
        grade_data = await self._grade_with_rubric(
            transcript_text=transcript_text,
            language=language,
            ui_locale=ui_locale,
            format=format,
            prompt_text=prompt_text,
            rubric_hints=rubric_hints,
            user_context=user_context,
        )

        response = SpeakingGradeResponse(
            format=format,  # type: ignore[arg-type]
            transcription=transcript_text,
            detectedLanguage=transcription.language,
            overallAssessment=grade_data.get("overall_assessment", "Analysis complete."),
            positivePoints=list(grade_data.get("positive_points") or []),
            areasForImprovement=list(grade_data.get("areas_for_improvement") or []),
            identifiedErrors=[
                IdentifiedError(**e)
                for e in (grade_data.get("identified_errors") or [])
                if isinstance(e, dict)
            ],
            pronunciation=pronunciation,
            contentScore=_safe_int(grade_data.get("content_score")),
            coherenceScore=_safe_int(grade_data.get("coherence_score")),
            vocabularyScore=_safe_int(grade_data.get("vocabulary_score")),
        )
        await self._log_grade_to_history(
            user_context=user_context,
            language=language,
            format=format,
            response=response,
        )
        return response

    async def _log_grade_to_history(
        self,
        user_context: Optional[UserContext],
        language: str,
        format: str,
        response: SpeakingGradeResponse,
    ) -> None:
        """Surface guided-practice attempts in the user's history page.
        We use the same `taskType: "speaking"` bucket as the legacy
        free-analyze flow so the History filters keep working — the
        format itself goes into metadata for future drill-down."""
        if not user_context:
            return
        try:
            from utils.language_codes import to_iso_language

            # Pick the best single score we have to populate the
            # history's "score" column. Match% for repeat_after_me;
            # contentScore for everything else; fall back to fluency.
            score: Optional[int] = None
            if response.matchPercent is not None:
                score = int(round(response.matchPercent))
            elif response.contentScore is not None:
                score = response.contentScore
            elif response.pronunciation:
                score = int(round(response.pronunciation.fluency_score))

            await self.user_service.log_task_history(
                user_context,
                {
                    "taskType": "speaking",
                    "title": f"Speaking ({format}, {language})",
                    "score": score,
                    "language": to_iso_language(language),
                    "metadata": {
                        "speakingFormat": format,
                        "transcriptionPreview": response.transcription[:120],
                        "contentScore": response.contentScore,
                        "coherenceScore": response.coherenceScore,
                        "vocabularyScore": response.vocabularyScore,
                        "matchPercent": response.matchPercent,
                        "wordErrorRate": response.wordErrorRate,
                        "fluencyScore": response.pronunciation.fluency_score
                        if response.pronunciation
                        else None,
                        "errorCount": len(response.identifiedErrors),
                    },
                },
            )
        except Exception as e:
            # History logging is best-effort — never block the grade
            # response on a downstream failure.
            logger.warning("History logging for speaking grade failed: %s", e)

    # ---------- Internal helpers ---------------------------------------

    @staticmethod
    def _build_focus_clause(
        focus_keywords: Optional[List[str]],
        focus_weaknesses: Optional[List[str]],
    ) -> str:
        if not focus_keywords and not focus_weaknesses:
            return ""
        bits: list[str] = []
        if focus_weaknesses:
            bits.append("areas to drill: " + ", ".join(focus_weaknesses[:3]))
        if focus_keywords:
            bits.append("incorporate these: " + ", ".join(focus_keywords[:5]))
        return "Use the learner's recent weaknesses — " + "; ".join(bits) + "."

    async def _generate_timed_response_prompt(
        self,
        language: str,
        level: str,
        ui_locale: str,
        focus_clause: str,
        user_context: Optional[UserContext],
    ) -> Dict[str, str]:
        prompt = f"""
You are a speaking coach. Produce ONE open-ended question in {language}
for a {level} learner to answer aloud in about 30 seconds.

The question MUST:
- Demand a substantive personal answer (not yes/no, not factual recall).
- Be answerable in 30 seconds without specialist knowledge.
- Be appropriate for {level} — vocabulary and grammar within reach.
- {focus_clause if focus_clause else "Pick a generally engaging everyday topic."}

Return JSON only: {{"question": "<question in {language}>",
"translation": "<short {ui_locale} gloss of the question>"}}.
""".strip()
        return await self._call_and_parse_json(
            prompt, user_context=user_context, fallback_key="question"
        )

    async def _generate_picture_description_prompt(
        self,
        language: str,
        level: str,
        ui_locale: str,
        focus_clause: str,
        user_context: Optional[UserContext],
    ) -> Dict[str, str]:
        """Generate a scene the learner will describe aloud.

        Two outputs:
          - `visual_prompt`: a concise English Stable-Diffusion-style
            prompt fed to Pollinations.ai to render an actual image.
            Always English so SD models render reliably regardless
            of the learner's target language.
          - `scene`: the same scene phrased as a 2-3 sentence caption
            in the LEARNER'S target language, used as alt text and
            rendered when image load fails.
          - `translation`: optional UI-locale gloss for comprehension.
        """
        prompt = f"""
You are a speaking coach + image-prompt designer. Produce ONE concrete
visual scene a {level} learner will describe aloud in about 60 seconds
in {language}.

The scene MUST:
- Be a single rich, photographable situation (not a list of unrelated
  objects, not abstract, not fantasy).
- Have ≥4 distinguishable visible elements (people, props, setting,
  mood) so the learner can fill 60 seconds.
- Be grounded in everyday life: coffee shop, train station, family
  picnic, classroom, market stall, gym, park bench, kitchen.
- {focus_clause if focus_clause else "Pick a relatable everyday setting."}

Return strictly valid JSON with these EXACT keys:
{{
  "visual_prompt": "<English Stable-Diffusion prompt — concrete nouns, lighting, camera angle, photographic style, 15-30 words, NO speech-coach instructions>",
  "scene": "<2-3 sentences in {language} describing the same scene as a caption>",
  "translation": "<short {ui_locale} gloss of the scene, or empty string if {ui_locale} == {language}>"
}}

Example for English target, English UI:
{{"visual_prompt": "candid photo of a busy coffee shop on a rainy afternoon, a young woman alone at a small table stirring her latte, a half-read book and a phone next to her, warm lamp light, shallow depth of field, photorealistic",
  "scene": "A young woman sits alone at a small table in a busy coffee shop. She stirs her latte while watching the rain streak down the window beside her. A half-read book and a buzzing phone lie next to her cup.",
  "translation": ""}}

The `visual_prompt` MUST be in English regardless of {language} — open
image models (SDXL/Flux) generate more reliable photographs from
English prompts.
""".strip()
        data = await self._call_and_parse_json(
            prompt, user_context=user_context, fallback_key="scene"
        )
        # Make sure visual_prompt is present even if the model dropped
        # it; fall back to the scene text. Pollinations URL-encodes
        # whatever we hand it.
        if not data.get("visual_prompt"):
            data["visual_prompt"] = data.get("scene", "")
        return data

    async def _generate_monologue_prompt(
        self,
        language: str,
        level: str,
        ui_locale: str,
        focus_clause: str,
        user_context: Optional[UserContext],
    ) -> Dict[str, str]:
        prompt = f"""
You are a speaking coach. Produce ONE monologue topic in {language} for a
{level} learner to speak about for about 90 seconds.

The topic MUST:
- Demand a coherent extended answer (opinion, comparison, narration).
- Be answerable without specialist knowledge.
- Push for connector use (first, however, on the other hand, in the end).
- {focus_clause if focus_clause else "Pick a topic the learner can connect to personal experience."}

Return JSON only: {{"topic": "<topic in {language}, 1-2 sentences>",
"translation": "<short {ui_locale} gloss>"}}.
""".strip()
        return await self._call_and_parse_json(
            prompt, user_context=user_context, fallback_key="topic"
        )

    async def _call_and_parse_json(
        self,
        prompt: str,
        user_context: Optional[UserContext],
        fallback_key: str,
    ) -> Dict[str, str]:
        raw = await self.ai_service.get_ai_response(
            prompt, user_context=user_context, temperature=0.7
        )
        try:
            data = json.loads(raw)
        except Exception:
            data = {fallback_key: raw.strip()[:300], "translation": ""}
        if not isinstance(data, dict) or not data.get(fallback_key):
            from utils.error_codes import (
                AI_RESPONSE_PARSE_FAILED,
                raise_with_code,
            )
            raise_with_code(
                AI_RESPONSE_PARSE_FAILED,
                500,
                f"Speaking-prompt response missing required field '{fallback_key}'.",
            )
        return {k: str(v) for k, v in data.items() if isinstance(v, (str, int, float))}

    async def _grade_with_rubric(
        self,
        transcript_text: str,
        language: str,
        ui_locale: Optional[str],
        format: str,
        prompt_text: str,
        rubric_hints: List[str],
        user_context: Optional[UserContext],
    ) -> Dict[str, Any]:
        feedback_lang_map = {
            "en": "English", "pl": "Polish", "es": "Spanish", "ru": "Russian",
            "fr": "French", "de": "German", "it": "Italian",
        }
        feedback_lang = feedback_lang_map.get(
            (ui_locale or "en").split("-")[0].lower(), "English"
        )

        # Format-specific score fields the LLM should emit. We always
        # ask for content_score; coherence/vocabulary only when they
        # belong in the rubric so we don't pollute the JSON for
        # formats that don't use them.
        score_fields = ['"content_score": <0-100>']
        if format in ("picture_description", "free_monologue"):
            score_fields.append('"coherence_score": <0-100>')
            score_fields.append('"vocabulary_score": <0-100>')
        score_block = ",\n          ".join(score_fields)

        prompt = f"""
You are evaluating a {language} learner's spoken response.

PROMPT THE LEARNER WAS GIVEN:
\"\"\"{prompt_text}\"\"\"

LEARNER'S TRANSCRIBED RESPONSE:
\"\"\"{transcript_text}\"\"\"

Rubric (each score is 0-100, scored against {language} norms for the
learner's level — be supportive, not pedantic):
{', '.join(rubric_hints)}

Apply these thresholds before flagging anything:
1. Filler words and false starts are normal in speech, not errors.
2. Only flag objectively WRONG language — broken grammar, wrong word,
   missing required morphology, wrong word order.
3. If the response is off-topic, score `content_score` low and say so
   in the assessment — don't pretend it answered the prompt.

Return JSON only with EXACTLY this shape:
{{
  "overall_assessment": "<1-2 sentences in {feedback_lang}>",
  "positive_points": ["concrete things done well, in {feedback_lang}"],
  "areas_for_improvement": ["1-3 high-leverage areas, in {feedback_lang}"],
  "identified_errors": [
    {{
      "error_type": "Grammar|Vocabulary|Phrasing|Fluency",
      "erroneous_text": "<verbatim from transcription>",
      "explanation": "<1 sentence in {feedback_lang}>",
      "suggestion": "<corrected version>"
    }}
  ],
  {score_block}
}}

identified_errors length: 0 to 5. error_type stays in English. Output valid JSON, no prose.
""".strip()
        try:
            raw = await self.ai_service.get_ai_response(
                prompt=prompt, user_context=user_context
            )
            return json.loads(raw)
        except Exception as e:
            logger.warning("Speaking grade JSON parse failed: %s", e)
            # Don't blow up the whole response — return an empty
            # rubric grade and let the FE render whatever it has.
            return {
                "overall_assessment": "Could not parse grading output. Try again.",
                "positive_points": [],
                "areas_for_improvement": [],
                "identified_errors": [],
            }

    async def _persist_static_audio(self, audio_bytes: bytes) -> str:
        """Write TTS bytes under static/audio/<uuid>.mp3 and return
        the public URL. Mirrors the listening service path so the FE
        plays the same way."""
        public_base = os.getenv("PUBLIC_BASE_URL", "")
        audio_dir = "static/audio"
        os.makedirs(audio_dir, exist_ok=True)
        file_name = f"{uuid.uuid4()}.mp3"
        file_path = os.path.join(audio_dir, file_name)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(audio_bytes)
        return f"{public_base}/static/audio/{file_name}"


# ---------- Module-level helpers ---------------------------------------


# Pollinations.ai is open, no-API-key, no-registration text-to-image.
# We hit GET https://image.pollinations.ai/prompt/<urlencoded prompt>
# and the service returns a PNG directly. The free tier caches by
# (prompt, seed, model), so the same scene description is reproducible
# across page reloads — useful for the practice-loop UX. We pin
# `model=flux` because at the time of writing it's the highest-quality
# SDXL-tier free model on the platform and supports realistic photos.
_POLLINATIONS_BASE = "https://image.pollinations.ai/prompt/"
_POLLINATIONS_PARAMS = {
    "model": "flux",
    "width": "1024",
    "height": "768",
    "nologo": "true",
    "private": "true",
    "enhance": "true",
}


def _build_pollinations_url(visual_prompt: str) -> str:
    """Return a Pollinations.ai image URL for the given scene prompt.

    URL-encodes the prompt with quote_plus (the path segment lives
    after `/prompt/` and pollinations expects + for spaces). Trims
    overly long prompts to ~600 chars — long URLs occasionally trip
    a 414 from upstream proxies. Tags the request with `?nologo`
    because we render the image inside our own UI; `enhance=true`
    nudges the model toward higher detail."""
    import urllib.parse

    cleaned = re.sub(r"\s+", " ", (visual_prompt or "").strip())[:600]
    if not cleaned:
        cleaned = "everyday scene, photo"
    encoded = urllib.parse.quote(cleaned, safe="")
    qs = "&".join(f"{k}={v}" for k, v in _POLLINATIONS_PARAMS.items())
    return f"{_POLLINATIONS_BASE}{encoded}?{qs}"


def _dedupe_translation(scene: str, translation: str) -> str:
    """Don't render a translation that's just the scene repeated.

    The LLM occasionally fills `translation` with the same string as
    the source language when UI locale matches the target language —
    that produces the "same paragraph twice" UX the user complained
    about in the picture-description screenshot."""
    if not translation:
        return ""
    if scene.strip().lower() == translation.strip().lower():
        return ""
    return translation


_TOKEN_RE = re.compile(r"\w+", flags=re.UNICODE)


def _tokens(text: str) -> List[str]:
    return [m.group(0).lower() for m in _TOKEN_RE.finditer(text)]


def _word_error_rate(reference: str, hypothesis: str) -> float:
    """Standard Levenshtein-distance-based word error rate.

    Uses lower-cased word tokens (punctuation stripped) so capitalisation
    and punctuation differences don't penalise pronunciation grading.
    Returns 1.0 when the reference is empty (every hypothesis word is
    "wrong" because there's nothing to be right against).
    """
    ref = _tokens(reference)
    hyp = _tokens(hypothesis)
    if not ref:
        return 1.0 if hyp else 0.0
    # Levenshtein on word tokens — O(len(ref)*len(hyp)). Phrases here
    # are short (≤30 words), so the quadratic cost is irrelevant.
    n, m = len(ref), len(hyp)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref[i - 1] == hyp[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[n][m] / n


def _safe_int(value: Any) -> Optional[int]:
    try:
        if value is None:
            return None
        return max(0, min(100, int(value)))
    except (TypeError, ValueError):
        return None
