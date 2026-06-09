from typing import Dict, Any
import json
import logging
from services.ai_service import AI_Service
from models.dtos.verification_dtos import VerificationResult, BetterTask
from constants.prompts import verify_french_task_prompt, verify_polish_task_prompt

logger = logging.getLogger(__name__)


class VerificationPipeline:
    def __init__(self, ai_service: AI_Service):
        self.ai_service = ai_service

    async def verify_task(self, task: Dict[str, Any], language: str) -> VerificationResult:
        prompt_func = None
        if language == "French":
            prompt_func = verify_french_task_prompt
        elif language == "Polish":
            prompt_func = verify_polish_task_prompt
        else:
            logger.warning(f"Unsupported language for verification: {language}")
            return VerificationResult(is_valid=True)

        prompt = prompt_func(task)
        response_str = await self.ai_service.get_ai_response(prompt)
        logger.debug(f"Verification response: {response_str}")

        try:
            response_json = json.loads(response_str)
            if not response_json.get("is_valid") and response_json.get("better_task"):
                response_json["better_task"] = BetterTask(**response_json["better_task"])
            else:
                response_json["better_task"] = None
            return VerificationResult(**response_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse verification JSON for {language}: {e}")
            return VerificationResult(is_valid=False, explanation=f"AI response not valid JSON: {e}")
        except Exception as e:
            logger.error(f"Error processing verification response for {language}: {e}")
            return VerificationResult(is_valid=False, explanation=f"Error processing AI response: {e}")
