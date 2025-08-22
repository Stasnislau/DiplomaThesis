import json
from services.ai_service import AI_Service
from models.dtos.verification_dtos import VerificationResult, BetterTask
from constants.prompts import verify_french_task_prompt, verify_polish_task_prompt


class VerificationPipeline:
    def __init__(self, ai_service: AI_Service):
        self.ai_service = ai_service

    async def verify_task(self, task: dict, language: str) -> VerificationResult:
        prompt_func = None
        if language == "French":
            prompt_func = verify_french_task_prompt
        elif language == "Polish":
            prompt_func = verify_polish_task_prompt
        else:
            print(f"Unsupported language for verification: {language}")  # TODO: Remove this
            return VerificationResult(is_valid=True)

        prompt = prompt_func(task)
        response_str = await self.ai_service.get_ai_response(prompt)
        print(response_str)

        # Polish verification might return extra text, so we need to extract JSON
        # if language == "Polish":
        #     json_str_match = re.search(r"\{.*\}", response_str.replace("\n", ""), re.DOTALL)
        #     if not json_str_match:
        #         print(f"Failed to find JSON in AI response for Polish verification: {response_str}")
        #         return VerificationResult(is_valid=False, explanation="No valid JSON found in AI response for Polish verification")
        #     response_to_parse = json_str_match.group()
        # else:
        #     response_to_parse = response_str

        try:
            response_json = json.loads(response_str)
            if not response_json.get("is_valid") and response_json.get("better_task"):
                response_json["better_task"] = BetterTask(**response_json["better_task"])
            else:
                response_json["better_task"] = None
            return VerificationResult(**response_json)
        except json.JSONDecodeError as e:
            print(f"Failed to parse verification JSON for {language}: {e}\nRaw response: {response_str}")
            return VerificationResult(is_valid=False, explanation=f"AI response not valid JSON: {e}")
        except Exception as e:
            print(f"Error processing verification response for {language}: {e}")
            return VerificationResult(is_valid=False, explanation=f"Error processing AI response: {e}")
