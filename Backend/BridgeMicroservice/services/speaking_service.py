import json
import io
import whisper
import asyncio
import numpy as np
from pydub import AudioSegment

from fastapi import HTTPException
from dotenv import load_dotenv

from .ai_service import AI_Service
from models.dtos.speaking_analysis_dtos import WhisperTranscriptionResult, AIFeedbackResult, WhisperSegment, WhisperWord
from utils.convert_to_language_code import convert_to_language_code

load_dotenv()

# Load the Whisper model globally. This can take time and memory.
# Using "large-v3" model for best accuracy on capable hardware.
try:
    model = whisper.load_model("large-v3")
except Exception as e:
    print(f"Error loading Whisper model: {e}")
    model = None


class Speaking_Service:
    def __init__(self, ai_service: AI_Service):
        self.ai_service = ai_service

    async def _transcribe_audio_with_whisper(
        self, audio_file_bytes: bytes, filename: str, language_code: str
    ) -> WhisperTranscriptionResult:
        if not model:
            raise HTTPException(status_code=500, detail="Whisper model is not loaded.")

        try:
            # Convert audio to a format Whisper can process (numpy array)
            # pydub can handle various formats based on filename extension
            audio = AudioSegment.from_file(io.BytesIO(audio_file_bytes))
            # Convert to mono and set frame rate
            audio = audio.set_channels(1).set_frame_rate(16000)
            # Convert to numpy array
            samples = np.array(audio.get_array_of_samples()).astype(np.float32) / 32768.0

            # Since whisper.transcribe is synchronous, run it in a separate thread
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,  # Use the default thread pool executor
                lambda: model.transcribe(
                    samples,
                    language=language_code,
                    fp16=True,  # Set to True for better performance on GPU/MPS
                    word_timestamps=True,
                ),
            )

            print(response, "response --------------------------------------------------")

            transcribed_text = response.get("text", "")
            language = response.get("language")

            segments_data = response.get("segments", [])

            parsed_words = []
            parsed_segments = []

            if segments_data and isinstance(segments_data, list):
                for seg_data in segments_data:
                    if isinstance(seg_data, dict):
                        # Whisper library nests 'words' inside 'segments' when word_timestamps=True
                        segment_words_data = seg_data.get("words", [])
                        if segment_words_data and isinstance(segment_words_data, list):
                            parsed_words.extend([WhisperWord(**word) for word in segment_words_data if isinstance(word, dict)])

                        # The segment itself doesn't contain the words list in the final parsed model
                        seg_data.pop("words", None)
                        parsed_segments.append(WhisperSegment(**seg_data))

            return WhisperTranscriptionResult(
                text=transcribed_text,
                language=language,
                segments=parsed_segments,
                words=parsed_words,
                raw_response=response,
            )

        except Exception as e:
            print(f"Error during local Whisper transcription (using filename {filename}): {e}")
            raise HTTPException(status_code=500, detail=f"Failed to transcribe audio locally. Error: {str(e)}")

    async def _get_ai_feedback_on_transcription(self, transcription_result: WhisperTranscriptionResult) -> AIFeedbackResult:
        prompt = f"""
        The following text was transcribed from an audio recording of a user speaking:
        ---BEGIN TRANSCRIPTION---
        {transcription_result.text}
        ---END TRANSCRIPTION---

        Please analyze this text for any errors, including grammar, vocabulary, awkward phrasing, and common mistakes language learners make. Do not focus on pronunciation as this is a text analysis. Provide your feedback as a JSON object with the following structure:
        {{
          "overall_assessment": "A brief summary of the user's language proficiency based on the text.",
          "identified_errors": [
            {{
              "error_type": "e.g., Grammar, Vocabulary, Phrasing, Fluency",
              "erroneous_text": "The specific text segment containing the error.",
              "explanation": "A clear explanation of why it's an error.",
              "suggestion": "A corrected version or a suggestion for improvement."
            }}
          ],
          "positive_points": ["Optional: Mention any parts that were particularly good or correct, if any."],
          "areas_for_improvement": ["General areas the user should focus on based on the errors."]
        }}
        Ensure the output is a valid JSON object. If there are no errors, the "identified_errors" list should be empty.
        """
        try:
            ai_response_str = await self.ai_service.get_ai_response(prompt=prompt)
            ai_response_json = json.loads(ai_response_str)
            return AIFeedbackResult(**ai_response_json)
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI feedback JSON: {e}\nRaw response: {ai_response_str}")
            raise HTTPException(status_code=500, detail="Failed to parse AI feedback into expected JSON structure.")
        except Exception as e:
            print(f"Error getting AI feedback: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get AI feedback: {str(e)}")

    async def analyze_user_audio(self, audio_file_bytes: bytes, filename: str | None = None, language: str | None = None) -> str:
        print(f"Received audio file of size: {len(audio_file_bytes)} bytes for analysis.")
        if not audio_file_bytes:
            raise HTTPException(status_code=400, detail="No audio file provided.")

        effective_filename = filename if filename else "recording.webm"
        print(f"Analyzing with effective filename: {effective_filename}")
        language_code = convert_to_language_code(language) if language else "en"
        transcription_result = await self._transcribe_audio_with_whisper(audio_file_bytes, effective_filename, language_code)
        print(f"Transcription result: {transcription_result.text[:200]}...")
        if not transcription_result.text.strip():
            return "Could not transcribe any speech from the audio. Please try again with a clearer audio."

        ai_feedback = None
        try:
            ai_feedback = await self._get_ai_feedback_on_transcription(transcription_result)
        except Exception as e:
            print(f"Error getting AI feedback: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get AI feedback: {str(e)}")

        print(f"AI feedback: {ai_feedback}")

        feedback_summary = f"Overall: {ai_feedback.overall_assessment}\n"
        if ai_feedback.identified_errors:
            feedback_summary += "\nErrors Found:\n"
            for error in ai_feedback.identified_errors:
                feedback_summary += f"- Type: {error.error_type}\n  Text: '{error.erroneous_text}'\n  Explanation: {error.explanation}\n  Suggestion: {error.suggestion}\n"
        else:
            feedback_summary += "\nNo specific errors identified in the transcription!"

        if ai_feedback.positive_points:
            feedback_summary += "\nPositive Points:\n"
            for point in ai_feedback.positive_points:
                feedback_summary += f"- {point}\n"

        if ai_feedback.areas_for_improvement:
            feedback_summary += "\nAreas for Improvement:\n"
            for area in ai_feedback.areas_for_improvement:
                feedback_summary += f"- {area}\n"

        return feedback_summary.strip()
