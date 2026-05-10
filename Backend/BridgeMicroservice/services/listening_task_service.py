import asyncio
import json
import logging
import os
import uuid
from typing import List, Optional

import aiofiles

from constants.variety import variety_picker
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.responses.listening_task_response import (
    ListeningQuestion,
    ListeningQuestionAdapter,
    ListeningTaskResponse,
)
from services.ai_service import AI_Service
from services.tts_service import TTSService
from utils.user_context import UserContext

logger = logging.getLogger(__name__)
tts_service = TTSService()

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")


# Canonical question types this service understands. Anything else in
# the user's request_question_types is silently dropped — we don't
# crash on unknown types, but we also don't pass them to the prompt.
_KNOWN_TYPES = {
    "multiple_choice",
    "fill_in_the_blank",
    "dictation",
    "true_false_not_given",
    "sentence_completion",
    "multi_speaker_matching",
}

_DEFAULT_TYPES = ["multiple_choice", "fill_in_the_blank"]


class ListeningTaskService:
    def __init__(self, ai_service: AI_Service) -> None:
        self.ai_service = ai_service

    async def create_listening_task(
        self,
        request: ListeningTaskRequest,
        user_context: UserContext | None = None,
        focus_topic: str | None = None,
        focus_keywords: list[str] | None = None,
        focus_weaknesses: list[str] | None = None,
    ) -> ListeningTaskResponse:
        language = request.language
        level = request.level

        question_types = self._resolve_question_types(request.question_types)
        is_dictation_only = question_types == ["dictation"]
        needs_dialogue = "multi_speaker_matching" in question_types

        session_key = user_context.user_id if user_context else "listening_global"
        variety = variety_picker.pick_bundle(level, session_key=session_key)
        seed = str(uuid.uuid4())[:8]
        if focus_topic:
            variety = {**variety, "topic": focus_topic}
        focus_clause = ""
        if focus_keywords:
            focus_clause = (
                "\n        - Specifically work in this vocabulary or "
                f"grammar focus: {', '.join(focus_keywords[:6])}."
            )
        if focus_weaknesses:
            focus_clause += (
                f"\n        - WEAKNESS TO TARGET (HARD REQUIREMENT): {', '.join(focus_weaknesses[:3])}"
                " — at least one question MUST specifically test this weakness area."
            )

        prompt = self._build_prompt(
            language=language,
            level=level,
            variety=variety,
            seed=seed,
            focus_clause=focus_clause,
            question_types=question_types,
            is_dictation_only=is_dictation_only,
            needs_dialogue=needs_dialogue,
        )

        response = await self.ai_service.get_ai_response(
            prompt, user_context=user_context
        )
        try:
            content_json = json.loads(response)
        except json.JSONDecodeError as e:
            logger.error("Listening AI response is not valid JSON: %s", e)
            raise ValueError("Failed to parse AI response for listening task")

        transcript = str(content_json.get("transcript", "")).strip()
        raw_questions = content_json.get("questions") or []

        if not transcript:
            raise ValueError("Generated transcript is empty")

        questions: List[ListeningQuestion] = []
        for raw in raw_questions:
            if not isinstance(raw, dict):
                continue
            try:
                questions.append(ListeningQuestionAdapter.validate_python(raw))
            except Exception as e:
                logger.debug(
                    "Skipping malformed listening question (type=%s): %s",
                    raw.get("type"),
                    e,
                )
                continue

        if not questions:
            raise ValueError("Failed to parse AI response for listening task")

        # Multi-speaker synth when the transcript carries `[Speaker N]:`
        # tags; otherwise fall back to single-voice. This isolates the
        # FE-visible audio pipeline from whether we actually had
        # multi_speaker_matching items in the set — sometimes a model
        # produces dialogue regardless.
        try:
            loop = asyncio.get_running_loop()
            audio_bytes, speakers = await loop.run_in_executor(
                None,
                tts_service.synthesize_multispeaker,
                transcript,
                language,
                level,
            )
        except Exception as e:
            logger.error("TTS synthesis failed: %s", e)
            raise

        audio_dir = "static/audio"
        os.makedirs(audio_dir, exist_ok=True)
        file_name = f"{uuid.uuid4()}.mp3"
        file_path = os.path.join(audio_dir, file_name)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(audio_bytes)
        audio_url = f"{PUBLIC_BASE_URL}/static/audio/{file_name}"

        return ListeningTaskResponse(
            type="listening",
            audioUrl=audio_url,
            transcript=transcript,
            questions=questions,
            speakers=speakers,
        )

    @staticmethod
    def _resolve_question_types(requested: Optional[List[str]]) -> List[str]:
        """Filter the requested type list to canonical entries; fall
        back to the historical default mix when nothing usable came
        in. Preserves caller order so the prompt's emphasis matches
        what the user asked for first."""
        if not requested:
            return list(_DEFAULT_TYPES)
        seen: set[str] = set()
        out: List[str] = []
        for t in requested:
            key = (t or "").strip().lower()
            if key in _KNOWN_TYPES and key not in seen:
                seen.add(key)
                out.append(key)
        return out or list(_DEFAULT_TYPES)

    @staticmethod
    def _build_prompt(
        language: str,
        level: str,
        variety: dict,
        seed: str,
        focus_clause: str,
        question_types: List[str],
        is_dictation_only: bool,
        needs_dialogue: bool,
    ) -> str:
        # Length / shape of the transcript varies by what's being
        # tested. Dictation-only sessions need ONE short clip the
        # user can transcribe verbatim; multi-speaker sessions need
        # a dialogue with explicit speaker tags; everything else
        # uses the historical 100-150 word monologue.
        if is_dictation_only:
            transcript_clause = (
                f"1. Generate ONE short, clean sentence in {language} of about "
                f"10-18 words on the topic of \"{variety['topic']}\" with a "
                f"{variety['tone']} tone. The sentence must be appropriate "
                f"for a {level} learner — natural, unambiguous, and printable "
                f"verbatim from listening alone."
            )
            question_count_clause = (
                "Then create exactly ONE `dictation` question asking the "
                "learner to type what they heard. The `correctAnswer` MUST "
                "be the sentence above, verbatim, including punctuation."
            )
        elif needs_dialogue:
            transcript_clause = (
                f"1. Generate a short DIALOGUE in {language} of about 120-180 words "
                f"between 2-3 distinct speakers on the topic of "
                f"\"{variety['topic']}\" with a {variety['tone']} tone. Tag every "
                f"turn with `[Speaker 1]:`, `[Speaker 2]:`, etc. — exactly that "
                f"bracket-colon format on its own at the start of each line. "
                f"Speakers should hold distinguishable positions or roles so "
                f"the matching task has signal. Appropriate for a {level} learner."
            )
            question_count_clause = (
                "Then create 3-5 questions of the requested types. At least one "
                "MUST be a `multi_speaker_matching` whose `speakers` list matches "
                "the labels you used in the transcript and whose `statements` "
                "attribute each statement to its real speaker."
            )
        else:
            transcript_clause = (
                f"1. Generate a short, engaging {variety['format']} of about "
                f"100-150 words in {language} on the topic of "
                f"\"{variety['topic']}\" with a {variety['tone']} tone. The "
                f"content must be appropriate for a {level} learner."
            )
            question_count_clause = (
                "Then create 3-4 questions, mixing the requested types."
            )

        # Per-type schema reminders so the model knows the exact
        # wire shape for each variant. Only emit the ones the user
        # asked for to keep the prompt focused.
        schema_lines = []
        if "multiple_choice" in question_types:
            schema_lines.append(
                'multiple_choice: {"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correctAnswer":"<one of options>"}'
            )
        if "fill_in_the_blank" in question_types:
            schema_lines.append(
                'fill_in_the_blank: {"type":"fill_in_the_blank","question":"... ___ ...","correctAnswer":"<word>"}'
            )
        if "dictation" in question_types:
            schema_lines.append(
                'dictation: {"type":"dictation","question":"Type what you heard.","correctAnswer":"<exact transcript>"}'
            )
        if "true_false_not_given" in question_types:
            schema_lines.append(
                'true_false_not_given: {"type":"true_false_not_given","question":"<statement>","correctAnswer":"true" | "false" | "not_given"}'
            )
        if "sentence_completion" in question_types:
            schema_lines.append(
                'sentence_completion: {"type":"sentence_completion","question":"The speaker mentions ___ as the main reason.","correctAnswer":"<word>" or ["<v1>","<v2>"]}'
            )
        if "multi_speaker_matching" in question_types:
            schema_lines.append(
                'multi_speaker_matching: {"type":"multi_speaker_matching","question":"Who said what?","speakers":["Speaker 1","Speaker 2"],"statements":[{"statement":"...","correctSpeaker":"Speaker 1"},{"statement":"...","correctSpeaker":"Speaker 2"}]}'
            )
        schema_block = "\n  - ".join(schema_lines)

        question_types_csv = ", ".join(f'"{t}"' for t in question_types)

        return f"""
        You are an expert in language education. Your task is to create a listening exercise for a student learning {language} at the {level} level.

        Variation constraints (MUST be followed):
        - Topic: {variety['topic']}
        - Tone: {variety['tone']}
        - Format: {variety['format']}
        - Uniqueness seed: {seed}{focus_clause}

        Allowed question `type` values for this set: [{question_types_csv}].

        Please perform the following two steps:
        {transcript_clause}
        2. {question_count_clause}

        QUESTION RULES (HARD — this is a LISTENING task, not a reading test):
        - Questions and options MUST paraphrase ideas from the transcript, not
          quote it verbatim, EXCEPT for `dictation` (which is verbatim by
          definition).
        - For `true_false_not_given`: the `not_given` answer means the
          statement is plausible but never confirmed or denied by the audio.
          Reserve it for genuine "couldn't tell from the recording" cases —
          don't use it for trivially false statements.
        - For `sentence_completion`: the missing slot must be uniquely
          determined by the audio.
        - The correctAnswer for a multiple_choice question MUST be a paraphrase
          too, not a literal copy of a phrase from the transcript.
        - For `multi_speaker_matching`: every `correctSpeaker` value MUST
          match one of the labels in `speakers`, and the labels MUST match
          the `[Speaker N]:` tags in the transcript exactly.

        Provide the final output as a single JSON object with two keys:
        "transcript" (the story or dialogue) and "questions" (a list of
        question objects). Each question follows ONE of these schemas:
          - {schema_block}
        """
