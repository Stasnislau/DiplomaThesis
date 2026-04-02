import json
import os
import uuid
from typing import List, Union
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.responses.listening_task_response import ListeningTaskResponse, MultipleChoiceQuestion, FillInTheBlankQuestion
from services.ai_service import AI_Service
from utils.user_context import UserContext
from elevenlabs.client import ElevenLabs
import aiofiles
from pydantic import TypeAdapter

elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

BASE_URL = "http://localhost:3003"


class ListeningTaskService:
    def __init__(self, ai_service: AI_Service) -> None:
        self.ai_service = ai_service

    async def create_listening_task(
        self,
        request: ListeningTaskRequest,
        user_context: UserContext | None = None,
    ) -> ListeningTaskResponse:
        language = request.language
        level = request.level

        prompt = f"""
        You are an expert in language education. Your task is to create a listening exercise for a student learning {language} at the {level} level.

        Please perform the following two steps:
        1. Generate a short, engaging story or dialogue of about 100-150 words in {language}. The content should be appropriate for a {level} learner.
        2. Based on the story, create 3-4 comprehension questions. The questions should be a mix of "multiple_choice" and "fill_in_the_blank" types.

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
            audio = elevenlabs_client.text_to_speech.convert(
                text=transcript,
                voice_id="JBFqnCBsd6RMkjVDRZzb",
                model_id='eleven_multilingual_v2'
            )
        except Exception as e:
             print(f"Error calling ElevenLabs: {e}")
             raise e

        audio_dir = "static/audio"
        os.makedirs(audio_dir, exist_ok=True)
        file_name = f"{uuid.uuid4()}.mp3"
        file_path = os.path.join(audio_dir, file_name)

        async with aiofiles.open(file_path, "wb") as f:
            for chunk in audio:
                await f.write(chunk) 
        audio_url = f"{BASE_URL}/static/audio/{file_name}"

        return ListeningTaskResponse(
            type="listening",
            audioUrl=audio_url,
            transcript=transcript,
            questions=questions, 
        )
