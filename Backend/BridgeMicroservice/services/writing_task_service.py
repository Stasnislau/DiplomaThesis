import json
import uuid
from typing import Union, Any
from .vector_db_service import VectorDBService
from .ai_service import AI_Service
from dotenv import load_dotenv
from .bielik_service import Bielik_Service
from constants.prompts import writing_multiple_choice_task_prompt, writing_fill_in_the_blank_task_prompt, explain_answer_prompt
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.vector_db_dtos import SpecificSkillContext, FullLevelContext
from models.request.explain_answer_request import ExplainAnswerRequest
from fastapi import HTTPException
from models.responses.explain_answer_response import ExplainAnswerResponse
load_dotenv()


class Writing_Task_Service:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service):
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service

    async def generate_writing_multiple_choice_task(self, language: str, level: str) -> MultipleChoiceTask:
        level_context: Union[SpecificSkillContext, FullLevelContext, None] = self.vector_db_service.get_level_context(
            level.upper(), "writing"
        )
        if not level_context:
            raise ValueError(f"Invalid level: {level}")

        prompt = writing_multiple_choice_task_prompt(language, level, level_context.model_dump())
        response = await self.ai_service.get_ai_response(prompt)
        json_response = json.loads(response)
        print(json_response, "INITIAL TASK")
        verification_response = {"is_valid": True}
        try:
            # if language == "French":
            #     verification_response_str = await self.verify_generated_french_task(
            #         json_response
            #     )
            #     verification_response = json.loads(verification_response_str)
            # elif language == "Polish" and os.getenv("CHECK_WITH_BIELIK") == "1":
            #     verification_response = await self.verify_generated_polish_task(json_response)
            #     # Clean and parse the verification response
            #     if isinstance(verification_response, str):
            #         # Find the first valid JSON object in the response
            #         import re
            #         json_str = re.search(r'\{.*\}', verification_response.replace('\n', ''), re.DOTALL)
            #         if json_str:
            #             verification_response = json.loads(json_str.group())
            if verification_response.get("is_valid") is False and verification_response.get("better_task"):
                json_response = verification_response["better_task"]

            # Add missing fields required by the Pydantic model
            json_response["id"] = str(uuid.uuid4())
            json_response["type"] = "multiple_choice"

            # Validate and return the task
            try:
                return MultipleChoiceTask(**json_response)
            except Exception as e:
                print(f"Pydantic validation failed for MultipleChoiceTask. Data: {json_response}")
                print(f"Validation Error: {e}")
                # Re-raise or handle as appropriate
                raise HTTPException(status_code=500, detail=f"Failed to create valid task after verification: {e}")

        except Exception as e:
            print(f"Error during task generation/verification: {e}")
            # Even if verification fails, ensure ID and type are set if we attempt fallback
            # Note: json_response might be the original AI response here
            json_response["id"] = str(uuid.uuid4()) # Add ID here too for fallback
            json_response["type"] = "multiple_choice"
            # Attempt to return the original task if verification failed, but still validate
            try:
                print("Attempting to return original task after verification error...")
                return MultipleChoiceTask(**json_response)
            except Exception as e_fallback:
                print(f"Pydantic validation failed for fallback MultipleChoiceTask. Data: {json_response}")
                print(f"Validation Error: {e_fallback}")
                # Re-raise or handle as appropriate
                raise HTTPException(status_code=500, detail=f"Failed to create valid task even in fallback: {e_fallback}")

    async def generate_writing_fill_in_the_blank_task(self, language: str, level: str) -> FillInTheBlankTask:
        level_context: Union[SpecificSkillContext, FullLevelContext, None] = self.vector_db_service.get_level_context(
            level.upper(), "writing"
        )

        if not level_context:
            raise ValueError(f"Invalid level: {level}")

        prompt = writing_fill_in_the_blank_task_prompt(language, level, level_context.model_dump())
        response = await self.ai_service.get_ai_response(prompt)
        json_response = json.loads(response)

        # Ensure 'correctAnswer' is a string if it's a list
        if isinstance(json_response.get("correctAnswer"), list):
            if len(json_response["correctAnswer"]) > 0:
                json_response["correctAnswer"] = json_response["correctAnswer"][0]
            else:
                # Handle empty list case
                json_response["correctAnswer"] = ""
        
        # Add missing fields required by the Pydantic model
        json_response["id"] = str(uuid.uuid4())
        json_response["type"] = "fill_in_the_blank"
        
        # Validate and return the task
        try:
            return FillInTheBlankTask(**json_response)
        except Exception as e:
            print(f"Pydantic validation failed for FillInTheBlankTask. Data: {json_response}")
            print(f"Validation Error: {e}")
            # Re-raise or handle as appropriate
            raise HTTPException(status_code=500, detail=f"Failed to create valid task: {e}")

    async def explain_answer(
       self, explain_answer_request: ExplainAnswerRequest   
    ) -> ExplainAnswerResponse:
        language = explain_answer_request.language
        level = explain_answer_request.level
        task = explain_answer_request.task
        correct_answer = explain_answer_request.correct_answer
        user_answer = explain_answer_request.user_answer
        prompt = explain_answer_prompt(language, level, task, correct_answer, user_answer)
        response = await self.ai_service.get_ai_response(prompt)
        json_response = json.loads(response)
        json_response["type"] = "fill_in_the_blank"

        return ExplainAnswerResponse(**json_response)

    async def verify_generated_french_task(self, task: dict) -> str:
        prompt = f"""
        Vérifiez rigoureusement la tâche d'apprentissage suivante : 
        {task}

        CRITÈRES DE VÉRIFICATION :
        1. Précision linguistique :
            - Vérifiez l'exactitude grammaticale
            - Confirmez que l'orthographe est correcte
            - Assurez-vous que la conjugaison des verbes est appropriée

        2. Clarté et logique :
            - Confirmez que la tâche est claire et sans ambiguïté
            - Vérifiez que le contexte est cohérent et logique
            - Assurez-vous qu'il n'y a qu'UNE SEULE réponse possible

        3. Niveau de difficulté :
            - Vérifiez que le vocabulaire correspond au niveau ciblé
            - Confirmez que la structure grammaticale est appropriée au niveau

        4. Aspects culturels :
            - Assurez-vous que le contenu est culturellement approprié
            - Vérifiez que les références culturelles sont pertinentes

        Répondez en JSON avec le format suivant :
        {{
            "is_valid": boolean,
            "better_task": {{
                "question": "La question améliorée",
                "options": ["Option A améliorée", "Option B améliorée", "Option C améliorée", "Option D améliorée"],
                "correct_answer": "[La bonne réponse améliorée]", // array
            }} // Optionnel, seulement si la tâche n'est pas valide
        }}

        IMPORTANT : Si la tâche n'est pas valide, fournissez une version complètement améliorée qui corrige tous les problèmes identifiés. La structure de better_task doit correspondre exactement à la structure de la tâche originale, avec tous les champs nécessaires.
        """
        response = await self.ai_service.get_ai_response(prompt)
        print(response)
        return response

    async def verify_generated_polish_task(self, task: dict) -> dict[str, Any]:
        raise NotImplementedError("Polish task verification is yet to be verified")
        # Prepare verification prompt in Polish
        prompt = f"""
        Sprawdź dokładnie następujące zadanie językowe:
        {task}

        Nie potrzeba tłumaczyć zadania, tylko sprawdzić czy jest poprawne. Nie zwracaj better_task jeśli zadanie jest poprawne.

        Kryteria weryfikacji:
        1. Poprawność językowa:
            - Sprawdź poprawność gramatyczną
            - Potwierdź poprawność pisowni
            - Upewnij się, że odmiana wyrazów jest prawidłowa

        2. Jasność i logika:
            - Potwierdź, że zadanie jest jasne i jednoznaczne
            - Sprawdź, czy kontekst jest spójny i logiczny
            - Upewnij się, że jest tylko JEDNA poprawna odpowiedź

        3. Poziom trudności:
            - Sprawdź, czy słownictwo odpowiada docelowemu poziomowi
            - Potwierdź, że struktura gramatyczna jest odpowiednia

        Odpowiedz w formacie JSON:
        {{
            "is_valid": boolean,
            "better_task": {{
                "question": "Ulepszone pytanie",
                "options": ["Opcja A ulepszona", "Opcja B ulepszona", "Opcja C ulepszona", "Opcja D ulepszona"],
                "correct_answer": "[Poprawna ulepszona odpowiedź]" // array
            }} // Opcjonalne, tylko jeśli zadanie nie jest poprawne
        }}
        Kiedy zwracasz odpowiedź, zwróć tylko JSON, bez dodatkowych komentarzy i nie zwracaj better_task jeśli zadanie jest poprawne.
        """
        bielik_service = Bielik_Service()
        # response = await bielik_service.ask_bielik(prompt)
        # return json.loads(response) # TODO: Change to FillInTheBlankTask
