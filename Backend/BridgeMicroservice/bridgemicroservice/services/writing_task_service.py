import json
from .vector_db_service import VectorDBService
from .ai_service import AI_Service
from dotenv import load_dotenv
from .bielik_service import Bielik_Service
from ..constants.prompts import writing_multiple_choice_task_prompt, writing_fill_in_the_blank_task_prompt, explain_answer_prompt
import os
load_dotenv()


class Writing_Task_Service:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service):
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service

    async def generate_writing_multiple_choice_task(self, language: str, level: str):
        level_context = self.vector_db_service.get_level_context(
            level.upper(), "writing"
        )
        if not level_context:
            raise ValueError(f"Invalid level: {level}")

        prompt = writing_multiple_choice_task_prompt(language, level, level_context)
        response = await self.ai_service.get_ai_response(prompt)
        json_response = json.loads(response)
        print(json_response, "INITIAL TASK")
        try:
            if language == "French":
                verification_response = await self.verify_generated_french_task(
                    json_response
                )
                verification_response = json.loads(verification_response)
            elif language == "Polish" and os.getenv("CHECK_WITH_BIELIK") == "1":
                verification_response = await self.verify_generated_polish_task(json_response)
                # Clean and parse the verification response
                if isinstance(verification_response, str):
                    # Find the first valid JSON object in the response
                    import re
                    json_str = re.search(r'\{.*\}', verification_response.replace('\n', ''), re.DOTALL)
                    if json_str:
                        verification_response = json.loads(json_str.group())
            
            if verification_response.get("is_valid") is False and verification_response.get("better_task"):
                json_response = verification_response["better_task"]
            
            json_response["type"] = "multiple_choice"
            return json_response
            
        except Exception as e:
            print(f"Verification error: {e}")
            json_response["type"] = "multiple_choice"
            return json_response

    async def generate_writing_fill_in_the_blank_task(self, language: str, level: str):
        level_context = self.vector_db_service.get_level_context(
            level.upper(), "writing"
        )

        if not level_context:
            raise ValueError(f"Invalid level: {level}")

        prompt = writing_fill_in_the_blank_task_prompt(language, level, level_context)
        response = await self.ai_service.get_ai_response(prompt)
        json_response = json.loads(response)
        json_response["type"] = "fill_in_the_blank"

        return json_response

    async def explain_answer(
        self,
        user_language: str,
        user_level: str,
        task: str,
        correct_answer: str,
        user_answer: str,
    ):
        prompt = explain_answer_prompt(user_language, user_level, task, correct_answer, user_answer)
        response = await self.ai_service.get_ai_response(prompt)
        json_response = json.loads(response)
        json_response["type"] = "fill_in_the_blank"

        return json_response

    async def verify_generated_french_task(self, task: str):
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
                "task": "La question améliorée",
                "options": ["Option A améliorée", "Option B améliorée", "Option C améliorée", "Option D améliorée"],
                "correct_answer": "[La bonne réponse améliorée]", // array
            }} // Optionnel, seulement si la tâche n'est pas valide
        }}

        IMPORTANT : Si la tâche n'est pas valide, fournissez une version complètement améliorée qui corrige tous les problèmes identifiés. La structure de better_task doit correspondre exactement à la structure de la tâche originale, avec tous les champs nécessaires.
        """
        response = await self.ai_service.get_mistral_response(prompt)
        print(response)
        return response

    async def verify_generated_polish_task(self, task: dict) -> dict:
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
                "task": "Ulepszone pytanie",
                "options": ["Opcja A ulepszona", "Opcja B ulepszona", "Opcja C ulepszona", "Opcja D ulepszona"],
                "correct_answer": "[Poprawna ulepszona odpowiedź]" // array
            }} // Opcjonalne, tylko jeśli zadanie nie jest poprawne
        }}
        Kiedy zwracasz odpowiedź, zwróć tylko JSON, bez dodatkowych komentarzy i nie zwracaj better_task jeśli zadanie jest poprawne.
        """
        bielik_service = Bielik_Service()
        response = await bielik_service.ask_bielik(prompt)
        return json.loads(response)
