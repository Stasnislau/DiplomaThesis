import logging

from dotenv import load_dotenv
from fastapi import HTTPException, status
from litellm import acompletion
from litellm.exceptions import (
    AuthenticationError,
    RateLimitError,
    Timeout,
)
from typing import Optional, Union, Dict, Any, Tuple

from services.user_service import UserService
from utils.user_context import UserContext

logger = logging.getLogger(__name__)

load_dotenv()


PROVIDER_CONFIG: Dict[str, Dict[str, Any]] = {
    "openai": {"model": "gpt-5.4-mini"},
    "google-geminis": {"model": "gemini/gemini-3-flash-preview"},
    "mistral": {"model": "mistral/mistral-large-latest"},
    "claude": {"model": "anthropic/claude-haiku-4-5-20251001"},
    "deepseek": {
        "model": "deepseek/deepseek-chat",
        "api_base": "https://api.deepseek.com",
    },
    "groq": {"model": "groq/llama-3.3-70b-versatile"},
}


class AI_Service:
    def __init__(self) -> None:
        self.user_service = UserService()

    def _resolve_provider_params(
        self, ai_provider_id: str, api_key: Optional[str], require_api_key: bool
    ) -> Tuple[str, Dict[str, Any]]:
        provider_config = PROVIDER_CONFIG.get(ai_provider_id)
        if not provider_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported AI provider: {ai_provider_id}",
            )

        model = provider_config["model"]
        extra_params = {k: v for k, v in provider_config.items() if k != "model"}
        if api_key:
            extra_params["api_key"] = api_key
        elif require_api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AI API key is missing for the selected provider",
            )
        return model, extra_params

    async def get_ai_response(
        self, 
        prompt: str, 
        model: str = "gemini/gemini-3-flash-preview",
        response_format: Optional[Dict[str, str]] = {"type": "json_object"},
        system_prompt: str = "You are a philologist with over 20 years of experience in language education.",
        user_context: Optional[UserContext] = None,
        ai_provider_id: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        litellm_model = model
        litellm_params: Dict[str, Any] = {}

        if user_context:
            token = await self.user_service.get_default_ai_token(
                user_context, ai_provider_id=ai_provider_id
            )
            litellm_model, litellm_params = self._resolve_provider_params(
                token.get("aiProviderId", "google-geminis"),
                token.get("token"),
                require_api_key=True,
            )
        else:
            litellm_model, litellm_params = self._resolve_provider_params(
                ai_provider_id or "google-geminis",
                api_key=None,
                require_api_key=False,
            )

        if model and not user_context and ai_provider_id is None:
            litellm_model = model

        try:
            chat_response = await acompletion(
                model=litellm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                response_format=response_format,
                timeout=180,
                temperature=temperature,
                **litellm_params,
            )
        except AuthenticationError:
            logger.error("Invalid API key for model %s", litellm_model)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired API key for the selected AI provider",
            )
        except RateLimitError:
            logger.warning("Rate limit hit for model %s", litellm_model)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI provider rate limit exceeded, please try again later",
            )
        except Timeout:
            logger.warning("Timeout calling model %s", litellm_model)
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="AI provider did not respond in time",
            )
        except Exception as exc:
            logger.exception("Unexpected error from AI provider: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI provider request failed",
            )

        content: Optional[str] = chat_response.choices[0].message.content
        if content is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI provider returned empty content",
            )
        return content
