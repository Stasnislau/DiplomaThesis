from services.vector_db_service import VectorDBService
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import io
from typing import List, Dict, Any, Optional
from services.ai_service import AI_Service
from utils.user_context import UserContext

class MaterialService:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service):
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    async def process_pdf(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        try:
            # 1. Parse PDF
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"

            if not text.strip():
                raise ValueError("PDF content is empty or not extractable")

            # 2. Split Text
            chunks = self.text_splitter.split_text(text)
            
            # 3. Prepare Metadata
            metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]

            # 4. Save to Vector DB
            self.vector_db_service.save_chunks(chunks, metadatas)

            # NO SUMMARY GENERATION HERE. Just pure indexing.
            return {
                "filename": filename, 
                "chunks_count": len(chunks), 
                "status": "success",
                "message": "File indexed successfully. Ready to generate tasks."
            }

        except Exception as e:
            print(f"Error processing PDF: {e}")
            raise e

    async def generate_quiz(
        self, user_context: Optional[UserContext] = None
    ) -> Dict[str, Any]:
        try:
            # 1. Search for potential existing questions/exercises in the document
            # We search for keywords that usually indicate tasks
            relevant_docs = self.vector_db_service.search_materials(
                "exercises questions tasks complete the sentences multiple choice match true false", 
                limit=8
            )
            
            if not relevant_docs:
                 return {"quiz": "No relevant material found to generate tasks."}

            context_text = "\n\n".join([doc["text"] for doc in relevant_docs])

            # 2. Prompt to find pattern and generate SIMILAR tasks
            prompt = f"""
            Analyze the following text excerpts from a textbook/document. 
            Identify the style and type of educational exercises/questions present (e.g., fill in the blank, multiple choice, open questions).
            
            Then, generate 3 NEW similar exercises that test similar concepts or vocabulary, adhering to the identified style.
            
            Strictly return the result as a JSON object with a key "questions".
            "questions" is a list of objects, where each object has:
            - "question": The question text (or instruction).
            - "options": A list of strings (if multiple choice, otherwise empty list).
            - "correct_answer": The correct answer string.
            - "type": The type of question (e.g., "multiple_choice", "open", "fill_blank").
            
            Context Text:
            {context_text}
            """

            response_json = await self.ai_service.get_ai_response(
                prompt,
                response_format={"type": "json_object"},
                system_prompt="You are an expert teacher. Your goal is to create new practice material that mirrors the style of the provided source text.",
                user_context=user_context,
            )
            
            return {"quiz": response_json}

        except Exception as e:
             print(f"Error generating tasks: {e}")
             raise e
