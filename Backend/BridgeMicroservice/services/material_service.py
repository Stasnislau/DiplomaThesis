from services.vector_db_service import VectorDBService
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import io
from typing import List, Dict, Any, Optional, Union
from fastapi import HTTPException
from services.ai_service import AI_Service
from services.user_service import UserService
from utils.user_context import UserContext
import json
import logging
from models.dtos.material_dtos import ProcessPdfResponse, GenerateQuizResponse, ChunkMetadata, QuizContent

logger = logging.getLogger(__name__)

class MaterialService:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service) -> None:
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service
        self.user_service = UserService()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    async def process_pdf(self, file_content: bytes, filename: str, user_context: Optional[object] = None) -> ProcessPdfResponse:
        try:
            logger.info(f"Parsing PDF: {filename}")
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"

            if not text.strip():
                from utils.error_codes import PDF_NO_TEXT, raise_with_code
                raise_with_code(
                    PDF_NO_TEXT,
                    400,
                    "No selectable text found. The PDF is likely a scan or has its text encoded with a custom font.",
                )

            # Detect garbled text from custom-font / encrypted-encoding PDFs.
                        # pypdf still 'extracts' something, but it comes out as
            # high-bit nonsense like '\x03URWRNRĄ\x03' that no LLM can
            # parse and that triggers Groq's json_validate_failed when
            # asked for a structured response. Cheap heuristic: count
            # the share of characters that aren't word characters,
            # whitespace, or basic punctuation. Above 30% means the
            # extraction is garbage.
            import re as _re
            non_text = sum(
                1 for c in text
                if not _re.match(r"[\w\s.,;:!?\"'()\[\]{}\-—–‑/\\]", c, _re.UNICODE)
            )
            non_text_share = non_text / max(len(text), 1)
            if non_text_share > 0.30:
                logger.warning(
                    "PDF text appears garbled (non-text share %.1f%%) for %s",
                    non_text_share * 100,
                    filename,
                )
                from utils.error_codes import PDF_GARBLED_TEXT, raise_with_code
                raise_with_code(
                    PDF_GARBLED_TEXT,
                    400,
                    "PDF text could not be read cleanly — likely a scan or custom embedded font.",
                )

            logger.info(f"Extracted {len(text)} characters from PDF.")

            chunks = self.text_splitter.split_text(text)
            logger.info(f"Split text into {len(chunks)} chunks.")
            
            metadatas = [ChunkMetadata(source=filename, chunk_index=i) for i in range(len(chunks))]
            logger.info("Saving chunks to Vector DB...")
            owner_id = (
                user_context.user_id
                if isinstance(user_context, UserContext)
                else None
            )
            self.vector_db_service.save_chunks(chunks, metadatas, user_id=owner_id)

            logger.info("Analyzing question types using AI...")
            total_chunks = len(chunks)
            if total_chunks <= 5:
                selected_chunks = chunks
            else:
                indices = [0, 1, 2, total_chunks // 2, total_chunks // 2 + 1, total_chunks - 1]
                selected_chunks = [chunks[i] for i in sorted(list(set(indices))) if i < total_chunks]
            
            analysis_context = "\n--CHUNK SEPARATOR--\n".join(selected_chunks)

            ui_lang = (
                getattr(user_context, "ui_locale_label", None) or "English"
            )
            type_locale_clause = (
                f"\n\nWrite the `type` field in {ui_lang}. "
                "Keep the `example` field verbatim from the source text — do not translate it."
            )

            prompt = f"""
            Analyze the following text segments from an educational document.
            Identify the genuinely distinct types of exercises, questions, or
            learning activities present in this material.

            HARD RULES:
            - DO NOT propose types that aren't actually visible in the text.
              An empty list is acceptable if the document is prose only.
            - DO NOT pad the list with generic categories ("Reading
              Comprehension" is only a valid type if there are actual
              comprehension questions next to a passage; a passage by
              itself is just text).
            - Merge near-duplicates: "Gap fill" and "Fill in the blank"
              are the same type — pick one canonical name.
            - Ignore navigational/copyright/instructional boilerplate.

            For each identified type, extract ONE short example from the
            text (verbatim, ≤ 200 chars). If you can't quote a real
            example, leave the `example` field as an empty string rather
            than inventing one.

            Return the result strictly as a JSON object with a key "types",
            containing a list of objects. Each object must have:
            - "type":    Short canonical name of the activity type.
            - "example": Verbatim quote from the source, or "" if none.
            {type_locale_clause}

            Text Segments:
            {analysis_context}
            """

            try:
                response_json_str = await self.ai_service.get_ai_response(
                    prompt=prompt,
                    response_format={"type": "json_object"},
                    system_prompt="You are an expert pedagogue analyzing educational materials.",
                    user_context=user_context
                )
            except HTTPException as exc:
                # Groq sometimes returns 400 json_validate_failed on borderline
                # PDFs (the prompt produces a string with characters that
                # don't pass strict JSON validation, e.g. unescaped Unicode
                # control characters). Retry once WITHOUT strict mode and
                # parse loosely; if that still fails, surface a friendly
                # message instead of bubbling a raw 502.
                if exc.status_code in (400, 502):
                    logger.warning(
                        "Strict JSON mode failed on type analysis (%s); "
                        "retrying without response_format.",
                        exc.detail,
                    )
                    try:
                        response_json_str = await self.ai_service.get_ai_response(
                            prompt=prompt + "\n\nIMPORTANT: Respond with raw JSON only, no markdown fences.",
                            response_format=None,
                            system_prompt="You are an expert pedagogue analyzing educational materials.",
                            user_context=user_context,
                        )
                    except HTTPException:
                        from utils.error_codes import PDF_AI_REJECTED, raise_with_code
                        raise_with_code(
                            PDF_AI_REJECTED,
                            422,
                            "The AI couldn't produce a valid analysis from this PDF.",
                        )
                else:
                    raise

            analyzed_types: Union[List[Dict[str, Any]], List[Any]] = []

            try:
                # Tolerate models that wrap JSON in ``` fences when strict mode is off.
                cleaned = response_json_str.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.strip("`")
                    cleaned = cleaned.lstrip("json").strip()
                analyzed_data = json.loads(cleaned)
                if isinstance(analyzed_data, dict):
                    analyzed_types = analyzed_data.get("types", [])
                elif isinstance(analyzed_data, list):
                    analyzed_types = analyzed_data
                else:
                     analyzed_types = []

                logger.info(f"AI identified question types: {analyzed_types}")
            except Exception as e:
                logger.error(f"Failed to parse AI response for question types: {e}")
                analyzed_types = []

            return ProcessPdfResponse(
                filename=filename, 
                chunks_count=len(chunks), 
                status="success",
                analyzed_types=analyzed_types
            )

        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise e

    async def generate_quiz(
        self,
        selected_types: Optional[List[str]] = None,
        user_context: Optional[object] = None,
        target_language: Optional[str] = None,
    ) -> GenerateQuizResponse:
        try:
            logger.info(f"Generating quiz. Selected types: {selected_types}")
            owner_id = (
                user_context.user_id
                if isinstance(user_context, UserContext)
                else None
            )
            relevant_docs = self.vector_db_service.search_materials(
                "exercises questions tasks complete the sentences multiple choice match true false",
                limit=8,
                user_id=owner_id,
            )

            if not relevant_docs:
                 logger.warning("No relevant material found in Vector DB.")
                 return GenerateQuizResponse(quiz="No relevant material found to generate tasks.")

            context_text = "\n\n".join([str(doc.text) for doc in relevant_docs])

            type_instruction = ""
            if selected_types and len(selected_types) > 0:
                type_instruction = f"Focus ONLY on generating questions of the following types: {', '.join(selected_types)}."
            else:
                type_instruction = "Generate a variety of question types suitable for the content."

            ui_lang = (
                getattr(user_context, "ui_locale_label", None) or "English"
            )
            target_lang_clause = (
                f"\n            - The student is currently studying {target_language}. "
                f"Write `question`, `options`, `correct_answer` and `context_text` in "
                f"{target_language} regardless of the source-document language. "
                f"This is a learning aid, not a translation exercise."
                if target_language
                else "\n            - Match the language of the source material for `question`, "
                "`options`, `correct_answer` and `context_text`."
            )
            type_locale_clause = (
                f"\n            - Write the `type` field in {ui_lang} (e.g. `Wybór wielokrotny` for Polish, "
                "`Opción múltiple` for Spanish)."
                + target_lang_clause
            )

            prompt = f"""
            You are an expert language teacher creating practice materials for a student.
            
            **Step 1: Analyze the Content**
            Read the following text excerpts from an educational document. Identify the key learning points:
            - Topics (e.g., "Travel", "Food")
            - Grammar structures (e.g., "Past Simple", "Conditionals")
            - Vocabulary themes
            - Question types used in the original text (e.g., "Reading Comprehension", "Gap Fill")

            **Step 2: Generate NEW Tasks**
            Based on your analysis, create 3-5 **NEW** practice tasks/questions.
            {type_instruction}
            
            **CRITICAL RULES:**
            1.  **Do NOT copy** questions from the text. Create **original** questions testing the same concepts.
            2.  **For Reading Comprehension:**
                - If the source material contains a text followed by questions, you MUST write a **NEW, SIMILAR text** (100-200 words) on the same topic and difficulty level.
                - Then, generate questions based on your **NEW** text.
                - Include your new text in the `context_text` field for these questions.
            3.  **For Grammar/Vocabulary:**
                - Create **new sentences** that test the same grammar rules or vocabulary.
                - Do not use the exact sentences from the source.
            
            **Step 3: Output Format**
            Return a strictly valid JSON object with a single key "questions", containing a list of objects.
            Each object must have:
            - "question": The question text.
            - "options": A list of 3-4 strings (for multiple choice). Empty list [] for open questions.
            - "correct_answer": The correct answer string.
            - "type": One of: Multiple Choice | Open | Fill-in-Blank | True/False (translate the label per the locale rule below).
            - "context_text": The NEW text you wrote (if applicable, e.g., for Reading Comprehension). Otherwise null.{type_locale_clause}
            
            **Source Context:**
            {context_text}
            """

            response_json_str = await self.ai_service.get_ai_response(
                prompt,
                response_format={"type": "json_object"},
                system_prompt="You are an expert teacher creating practice materials.",
                user_context=user_context
            )
            
            try:
                parsed_quiz = json.loads(response_json_str)
                quiz_content = QuizContent(**parsed_quiz)

                if user_context and isinstance(user_context, UserContext):
                    await self.user_service.log_task_history(
                        user_context,
                        {
                            "taskType": "materials",
                            "title": "Materials quiz",
                            "score": None,
                            "language": None,
                            "metadata": {
                                "questionCount": len(quiz_content.questions or []),
                                "selectedTypes": selected_types or [],
                            },
                        },
                    )
                return GenerateQuizResponse(quiz=quiz_content)
            except Exception as e:
                 logger.warning(f"Could not parse quiz into strict model, returning raw JSON string: {e}")
                 return GenerateQuizResponse(quiz=response_json_str)

        except Exception as e:
             logger.error(f"Error generating tasks: {e}")
             raise e
