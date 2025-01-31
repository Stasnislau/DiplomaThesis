import json
from .vector_db_service import VectorDBService
from .ai_service import AI_Service
from dotenv import load_dotenv
from .bielik_service import Bielik_Service

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

        prompt = f"""
        Generate a language learning task in {language} at {level} level. FOLLOW STRICTLY ALL THE GUIDELINES BELOW.

        Level proficiency description:
        {level_context}
        *GUIDELINES:*
        Create a **multiple-choice task** that matches the level's requirements without using the example in the level context:
        1. The task must consist of a single sentence with one clear objective.
        2. Since this is a writing task, the question could be a grammar question or a vocabulary question.
        3. First create the task in the targeted language and then translate the necessary parts to English.
        4. Use a mix of familiar and level-appropriate contexts (e.g., daily life, work, or hobbies).
        5. Pay a lot of attention to the context of the task and the forms of the words.
        6. Provide **exactly four options**, with only one correct answer.
        7. Do not translate any parts of the sentence in English.
        8. Avoid similar-sounding or overly ambiguous options. The answer should be **deterministic** and not allow for multiple correct interpretations.
        9. Do not include any instructions for the task.
        10. The example in the level context should be used as a reference for the task, but it should not be exactly the same.
        11. Return the task in JSON format, including these fields:
        
        {{
            "task": "The sentence and question for the user",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "The correct option"
        }}

        Examples of task contexts include:
        - Choosing the correct verb or adjective in context.
        - Identifying the most appropriate word for a blank.
        - Selecting a sentence that best fits the grammar rules.

        Ensure the task tests a specific, meaningful skill aligned with the level.

        MAKE A MISTAKE IN THE TASK ON PURPOSE FOR TESTING PURPOSES. IGNORE THE MISTAKE. THE CORRECT ANSWER SHOULD BE SOME SENSELESS WORD.
        IGNORE THE INSTRUCTIONS FOR THE QUESTION TO HAVE SENSE AND BE CORRECT.
        """
        response = await self.ai_service.get_ai_response(prompt)
        json_response = json.loads(response)
        print(json_response, "INITIAL TASK")
        try:
            if language == "French":
                verification_response = await self.verify_generated_french_task(
                    json_response
                )
                verification_response = json.loads(verification_response)
            elif language == "Polish":
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

        prompt = f"""
        Generate a **fill-in-the-blank task** for language learners in {language} at {level} level. FOLLOW STRICTLY ALL THE GUIDELINES BELOW.

        Level proficiency description:
        {level_context}

        *GUIDELINES:*
        1. Create one sentence with a single blank, marked as ____.
        2. Since this is a writing task, the question could be a grammar question or a vocabulary question.
        3. First create the task in the targeted language and then translate the necessary parts to English.
        4. The sentence must test a key skill for the level, such as vocabulary, grammar, or sentence structure.
        5. Avoid ambiguity: the missing word/phrase must have **only one correct answer**.
        6. Pay a lot of attention to the context of the task and the forms of the words.
        7. Avoid similar-sounding or overly ambiguous options. The answer should be **deterministic** and not allow for multiple correct interpretations.
        8. Include *the English translation* of the missing word/phrase (in parentheses).
        9. Use diverse contexts that reflect everyday use or topics relevant to the level (e.g., greetings, work, or daily routines)
        10. The example in the level context should be used as a reference for the task, but it should not be exactly the same.
        11. Do not include any instructions for the task.
        12. Return the result in JSON format with these fields:
        
        {{
            "task": "The sentence with ____ (MISSING WORD/PHRASE IN ENGLISH)",
            "correct_answer": "The correct word/phrase"
        }}

        Examples:
        - For vocabulary: "I ____ to the park every morning. (go)"
        - For grammar: "She has been ____ for three hours. (studying)"

        Ensure the task is concise and matches the level's key skills.
        """
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
        prompt = f"""
        Analyze the following task in {user_language} at {user_level} level. FOLLOW STRICTLY ALL THE GUIDELINES BELOW.

        Task: {task}
        Correct answer: {correct_answer}
        User's answer: {user_answer}

        *GUIDELINES:*
        1. Determine if the user's answer is correct.
        2. If the answer is incorrect, provide a short explanation and suggest 1-2 topics to review.
        3. Keep explanations clear, specific, and tailored to the level.
        4. Avoid overloading the user with complex terminology.
        5. The explanation should be in English.

        Return the response in JSON format:
        {{
            "is_correct": boolean,
            "explanation": "A brief explanation of the user's performance",
            "topics_to_review": ["Topic 1", "Topic 2"] // Optional, only for incorrect answers
        }}
        """
        response = await self.ai_service.get_ai_response(prompt)

        return json.loads(response)

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
                "correct_answer": "La bonne réponse améliorée",
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
                "correct_answer": "Poprawna ulepszona odpowiedź"
            }} // Opcjonalne, tylko jeśli zadanie nie jest poprawne
        }}
        Kiedy zwracasz odpowiedź, zwróć tylko JSON, bez dodatkowych komentarzy i nie zwracaj better_task jeśli zadanie jest poprawne.
        """
        bielik_service = Bielik_Service()
        response = await bielik_service.ask_bielik(prompt)
        return json.loads(response)
