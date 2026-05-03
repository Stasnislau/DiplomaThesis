from services.vector_db_service import VectorDBService
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import io
from typing import List, Dict, Any, Optional, Union
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
                raise ValueError("PDF content is empty or not extractable")
            
            logger.info(f"Extracted {len(text)} characters from PDF.")

            chunks = self.text_splitter.split_text(text)
            logger.info(f"Split text into {len(chunks)} chunks.")
            
            metadatas = [ChunkMetadata(source=filename, chunk_index=i) for i in range(len(chunks))]
            logger.info("Saving chunks to Vector DB...")
            self.vector_db_service.save_chunks(chunks, metadatas)

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
            Identify distinct types of exercises, questions, or learning activities present (e.g., "Multiple Choice", "Reading Comprehension", "True/False", "Essay Writing").

            Ignore instructional text (e.g., "Read the instructions", "Copyright"). Focus on the actual learning content.

            For each identified type, extract (or if necessary, summarize) ONE short example from the text.

            Return the result strictly as a JSON object with a key "types", containing a list of objects. Each object must have:
            - "type": A short, descriptive name of the question/activity type (e.g., "Multiple Choice").
            - "example": A short example text from the document representing this type.

            If specific exercises are not found, identify the *potential* types of questions that would fit this content (e.g., "Reading Comprehension" for a text passage).
            {type_locale_clause}

            Text Segments:
            {analysis_context}
            """

            response_json_str = await self.ai_service.get_ai_response(
                prompt=prompt,
                response_format={"type": "json_object"},
                system_prompt="You are an expert pedagogue analyzing educational materials.",
                user_context=user_context
            )
            
            analyzed_types: Union[List[Dict[str, Any]], List[Any]] = []
            
            try:
                analyzed_data = json.loads(response_json_str)
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

    async def generate_quiz(self, selected_types: Optional[List[str]] = None, user_context: Optional[object] = None) -> GenerateQuizResponse:
        try:
            logger.info(f"Generating quiz. Selected types: {selected_types}")
            relevant_docs = self.vector_db_service.search_materials(
                "exercises questions tasks complete the sentences multiple choice match true false", 
                limit=8
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
            type_locale_clause = (
                f"\n            - Write the `type` field in {ui_lang} (e.g. `Wybór wielokrotny` for Polish, "
                "`Opción múltiple` for Spanish). Question content (`question`, `options`, "
                "`correct_answer`, `context_text`) stays in the language of the source material."
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
