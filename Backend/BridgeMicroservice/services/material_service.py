from services.vector_db_service import VectorDBService
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import io
from typing import List, Dict, Any, Optional
from services.ai_service import AI_Service
import json
import logging

logger = logging.getLogger(__name__)

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
            logger.info(f"Parsing PDF: {filename}")
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"

            if not text.strip():
                raise ValueError("PDF content is empty or not extractable")
            
            logger.info(f"Extracted {len(text)} characters from PDF.")

            # 2. Split Text
            chunks = self.text_splitter.split_text(text)
            logger.info(f"Split text into {len(chunks)} chunks.")
            
            # 3. Prepare Metadata
            metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]

            # 4. Save to Vector DB
            logger.info("Saving chunks to Vector DB...")
            self.vector_db_service.save_chunks(chunks, metadatas)

            # 5. Analyze Question Types using AI
            logger.info("Analyzing question types using AI...")
            # We take a subset of chunks (e.g., first few and maybe some random ones) to identify types
            analysis_context = "\n".join(chunks[:5]) 
            
            prompt = f"""
            Analyze the following text from an educational document. 
            Identify distinct types of exercises or questions present (e.g., "Multiple Choice", "Fill in the Blank", "True/False", "Open Question", "Matching").
            
            For each identified type, extract ONE short example from the text.
            
            Return the result strictly as a JSON list of objects. Each object must have:
            - "type": The name of the question type.
            - "example": A short example text from the document.
            
            If no specific exercises are found, suggest potential types that could be generated based on the content.
            
            Text:
            {analysis_context}
            """

            response_json_str = await self.ai_service.get_ai_response(
                prompt=prompt,
                response_format={"type": "json_object"},
                system_prompt="You are an expert pedagogue analyzing educational materials."
            )
            
            # Parse the response to ensure it's valid JSON
            try:
                analyzed_data = json.loads(response_json_str)
                # Normalize if wrapped in a key
                question_types = analyzed_data.get("types", analyzed_data) if isinstance(analyzed_data, dict) else analyzed_data
                logger.info(f"AI identified question types: {question_types}")
            except Exception as e:
                logger.error(f"Failed to parse AI response for question types: {e}")
                question_types = []

            return {
                "filename": filename, 
                "chunks_count": len(chunks), 
                "status": "success",
                "analyzed_types": question_types
            }

        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise e

    async def generate_quiz(self, selected_types: Optional[List[str]] = None) -> Dict[str, Any]:
        try:
            logger.info(f"Generating quiz. Selected types: {selected_types}")
            # 1. Search for potential existing questions/exercises in the document
            relevant_docs = self.vector_db_service.search_materials(
                "exercises questions tasks complete the sentences multiple choice match true false", 
                limit=8
            )
            
            if not relevant_docs:
                 logger.warning("No relevant material found in Vector DB.")
                 return {"quiz": "No relevant material found to generate tasks."}

            context_text = "\n\n".join([doc["text"] for doc in relevant_docs])

            # 2. Prompt to generate tasks
            type_instruction = ""
            if selected_types and len(selected_types) > 0:
                type_instruction = f"Focus ONLY on generating questions of the following types: {', '.join(selected_types)}."
            else:
                type_instruction = "Generate a variety of question types suitable for the content."

            prompt = f"""
            Analyze the following text excerpts from a textbook/document. 
            
            {type_instruction}
            
            Generate 3 NEW exercises/questions that test concepts found in the text.
            Adhere to the style of the original text if possible.
            
            Strictly return the result as a JSON object with a key "questions".
            "questions" is a list of objects, where each object has:
            - "question": The question text.
            - "options": A list of strings (if multiple choice, otherwise empty list).
            - "correct_answer": The correct answer string.
            - "type": The type of question (e.g., "Multiple Choice", "Open").
            
            Context Text:
            {context_text}
            """

            response_json = await self.ai_service.get_ai_response(
                prompt,
                response_format={"type": "json_object"},
                system_prompt="You are an expert teacher creating practice materials."
            )
            
            return {"quiz": response_json}

        except Exception as e:
             logger.error(f"Error generating tasks: {e}")
             raise e
