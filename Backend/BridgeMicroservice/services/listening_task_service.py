import json
import os
import uuid
from openai import AsyncOpenAI
import aiofiles
from models.dtos.listening_task_dto import ListeningTaskRequest
from models.responses.listening_task_response import ListeningTaskResponse

# It's better to manage the client centrally, but for simplicity, we initialize it here.
# Ensure OPENAI_API_KEY is set in your environment variables.
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# This should be in a config file, but for now, we'll define it here.
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3003")


class Listening_Task_Service:
    def __init__(self) -> None:
        # In a real app, you might inject dependencies like a config service.
        pass

    async def create_listening_task(self, request: ListeningTaskRequest) -> ListeningTaskResponse:
        language = request.language
        level = request.level

        # Step 1: Generate story and questions with GPT-4
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

        response = await client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        content_json = json.loads(response.choices[0].message.content)
        transcript = content_json["transcript"]
        questions = content_json["questions"]

        # Step 2: Generate audio from the transcript using OpenAI TTS
        tts_response = await client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=transcript,
        )

        # Step 3: Save the audio file locally
        audio_dir = "static/audio"
        os.makedirs(audio_dir, exist_ok=True)
        file_name = f"{uuid.uuid4()}.mp3"
        file_path = os.path.join(audio_dir, file_name)

        # Use aiofiles for async file writing
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(tts_response.content)

        # Step 4: Construct the response object
        audio_url = f"{BASE_URL}/static/audio/{file_name}"

        return ListeningTaskResponse(
            type="listening",
            audioUrl=audio_url,
            transcript=transcript,
            questions=questions,
        )
