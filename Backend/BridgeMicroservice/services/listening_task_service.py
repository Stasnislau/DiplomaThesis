import asyncio
import json
import os
import uuid
from typing import List, Union
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.responses.listening_task_response import ListeningTaskResponse, MultipleChoiceQuestion, FillInTheBlankQuestion
from services.ai_service import AI_Service
from services.tts_service import TTSService
from utils.user_context import UserContext
from constants.variety import variety_picker
import aiofiles
from pydantic import TypeAdapter

tts_service = TTSService()

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")


class ListeningTaskService:
    def __init__(self, ai_service: AI_Service) -> None:
        self.ai_service = ai_service

    async def create_listening_task(
        self,
        request: ListeningTaskRequest,
        user_context: UserContext | None = None,
        focus_topic: str | None = None,
        focus_keywords: list[str] | None = None,
    ) -> ListeningTaskResponse:
        language = request.language
        level = request.level

        session_key = user_context.user_id if user_context else "listening_global"
        variety = variety_picker.pick_bundle(level, session_key=session_key)
        seed = str(uuid.uuid4())[:8]
        # If the caller has an adaptive focus, override the random
        # topic with one derived from the user's recent weaknesses so
        # the listening passage drills exactly that.
        if focus_topic:
            variety = {**variety, "topic": focus_topic}
        focus_clause = ""
        if focus_keywords:
            focus_clause = (
                "\n        - Specifically work in this vocabulary or "
                f"grammar focus: {', '.join(focus_keywords[:6])}."
            )

        prompt = f"""
        You are an expert in language education. Your task is to create a listening exercise for a student learning {language} at the {level} level.

        Variation constraints (MUST be followed):
        - Topic: {variety['topic']}
        - Tone: {variety['tone']}
        - Format: {variety['format']}
        - Uniqueness seed: {seed}{focus_clause}

        Please perform the following two steps:
        1. Generate a short, engaging {variety['format']} of about 100-150 words in {language} on the topic of "{variety['topic']}" with a {variety['tone']} tone. The content must be appropriate for a {level} learner.
        2. Based on the content, create 3-4 comprehension questions. The questions should be a mix of "multiple_choice" and "fill_in_the_blank" types.

        QUESTION RULES (HARD — this is a LISTENING task, not a reading test):
        - Questions and options MUST paraphrase ideas from the transcript, not
          quote it verbatim. If the transcript says "She left for Madrid on
          Tuesday morning", the question should be "When did she travel?",
          not "When did she leave for Madrid?".
        - The correctAnswer for a multiple_choice question MUST be a
          paraphrase too, not a literal copy of a phrase from the transcript.
          Distractors should also be paraphrases (true-but-irrelevant or
          plausible-but-false), never random unrelated words.
        - For fill_in_the_blank: the missing word/phrase should be testable
          from listening, not pickable by glancing at the transcript shape.

        Provide the final output in a single JSON object format. The JSON object should have two keys: "transcript" (containing the story) and "questions" (containing a list of question objects).

        Each question object in the "questions" list must have:
        - "type": either "multiple_choice" or "fill_in_the_blank"
        - "question": The question text. For "fill_in_the_blank", use "___" to indicate the blank.
        - "options": A list of 3-4 possible answers (only for "multiple_choice").
        - "correctAnswer": The correct answer string.

        Example of the final JSON structure:
        {{
          "transcript": "...",
          "questions": [
            {{
              "type": "multiple_choice",
              "question": "...",
              "options": ["...", "...", "..."],
              "correctAnswer": "..."
            }},
            {{
              "type": "fill_in_the_blank",
              "question": "...",
              "correctAnswer": "..."
            }}
          ]
        }}
        """

        response = await self.ai_service.get_ai_response(
            prompt, user_context=user_context
        )

        try:
            content_json = json.loads(response)
            transcript = content_json.get("transcript", "")
            raw_questions = content_json.get("questions", [])
            
            question_adapter = TypeAdapter(List[Union[MultipleChoiceQuestion, FillInTheBlankQuestion]])
            questions = question_adapter.validate_python(raw_questions)

        except Exception as e:
            print(f"Error parsing AI response: {e}")
            raise ValueError("Failed to parse AI response for listening task")

        if not transcript:
             raise ValueError("Generated transcript is empty")

        try:
            loop = asyncio.get_running_loop()
            audio_bytes = await loop.run_in_executor(
                None, tts_service.synthesize, transcript, language, level
            )
        except Exception as e:
            print(f"Error calling Google Cloud TTS: {e}")
            raise e

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
        )
