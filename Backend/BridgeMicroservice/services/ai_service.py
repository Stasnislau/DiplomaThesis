import hashlib
import json
import logging
import time

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


# In-process AI response cache. Two motivations:
#   1) Cost — repeated calls with identical inputs don't bill the
#      provider twice. A user re-clicking 'Generate' or two parallel
#      requests for the same placement-task-with-same-seed share a
#      single completion.
#   2) Latency — Groq cold paths can spike 5-10s; warm cache hit is
#      microseconds.
# Notes / caveats:
#   - This is per-process. With a single bridge replica that's fine;
#     for multi-replica deploys this should move to Redis.
#   - We DON'T cache when temperature > 0.5 (the call site asked for
#     creativity — caching would defeat that).
#   - The cache key includes the user's API token (because litellm
#     dispatches requests by it), so two users with different keys
#     won't share entries even on identical prompts.
_AI_CACHE_TTL = 60 * 10  # 10 minutes
_AI_CACHE_MAX = 256
_ai_cache: Dict[str, Tuple[float, str]] = {}


def _ai_cache_key(model: str, prompt: str, system_prompt: str,
                  api_key: Optional[str], temperature: float,
                  response_format: Optional[Dict[str, str]]) -> str:
    h = hashlib.sha256()
    h.update(model.encode("utf-8"))
    h.update(b"\0")
    h.update(prompt.encode("utf-8"))
    h.update(b"\0")
    h.update(system_prompt.encode("utf-8"))
    h.update(b"\0")
    h.update((api_key or "").encode("utf-8"))
    h.update(b"\0")
    h.update(f"{temperature:.3f}".encode("utf-8"))
    h.update(b"\0")
    h.update(json.dumps(response_format or {}, sort_keys=True).encode("utf-8"))
    return h.hexdigest()


def _ai_cache_get(key: str) -> Optional[str]:
    entry = _ai_cache.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if time.time() > expires_at:
        _ai_cache.pop(key, None)
        return None
    return value


def _ai_cache_put(key: str, value: str) -> None:
    if len(_ai_cache) >= _AI_CACHE_MAX:
        oldest = min(_ai_cache.items(), key=lambda kv: kv[1][0])[0]
        _ai_cache.pop(oldest, None)
    _ai_cache[key] = (time.time() + _AI_CACHE_TTL, value)


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
        from utils.error_codes import (
            AI_PROVIDER_UNSUPPORTED,
            AI_API_KEY_MISSING,
            raise_with_code,
        )
        provider_config = PROVIDER_CONFIG.get(ai_provider_id)
        if not provider_config:
            raise_with_code(
                AI_PROVIDER_UNSUPPORTED,
                status.HTTP_400_BAD_REQUEST,
                f"Unsupported AI provider: {ai_provider_id}",
            )

        model = provider_config["model"]
        extra_params = {k: v for k, v in provider_config.items() if k != "model"}
        if api_key:
            extra_params["api_key"] = api_key
        elif require_api_key:
            raise_with_code(
                AI_API_KEY_MISSING,
                status.HTTP_400_BAD_REQUEST,
                "AI API key is missing for the selected provider",
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

        # Cache only deterministic-ish calls. Anything above temp 0.5 is
        # asking for creative variety (e.g. task generation), which is
        # exactly the case where a cache hit would hurt.
        cacheable = temperature <= 0.5
        cache_key = None
        if cacheable:
            cache_key = _ai_cache_key(
                litellm_model,
                prompt,
                system_prompt,
                litellm_params.get("api_key"),
                temperature,
                response_format,
            )
            cached = _ai_cache_get(cache_key)
            if cached is not None:
                logger.info("ai_service cache hit (model=%s)", litellm_model)
                return cached

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
        except HTTPException:
            raise
        except AuthenticationError:
            from utils.error_codes import AI_AUTH_FAILED, raise_with_code
            logger.error("Invalid API key for model %s", litellm_model)
            raise_with_code(
                AI_AUTH_FAILED,
                status.HTTP_401_UNAUTHORIZED,
                "Invalid or expired API key for the selected AI provider",
            )
        except RateLimitError:
            from utils.error_codes import AI_RATE_LIMITED, raise_with_code
            logger.warning("Rate limit hit for model %s", litellm_model)
            raise_with_code(
                AI_RATE_LIMITED,
                status.HTTP_429_TOO_MANY_REQUESTS,
                "AI provider rate limit exceeded, please try again later",
            )
        except Timeout:
            from utils.error_codes import AI_TIMEOUT, raise_with_code
            logger.warning("Timeout calling model %s", litellm_model)
            raise_with_code(
                AI_TIMEOUT,
                status.HTTP_504_GATEWAY_TIMEOUT,
                "AI provider did not respond in time",
            )
        except Exception as exc:
            from utils.error_codes import AI_BAD_GATEWAY, raise_with_code
            logger.exception("Unexpected error from AI provider: %s", exc)
            raise_with_code(
                AI_BAD_GATEWAY,
                status.HTTP_502_BAD_GATEWAY,
                "AI provider request failed",
            )

        content: Optional[str] = chat_response.choices[0].message.content
        if content is None:
            from utils.error_codes import AI_EMPTY_RESPONSE, raise_with_code
            raise_with_code(
                AI_EMPTY_RESPONSE,
                status.HTTP_502_BAD_GATEWAY,
                "AI provider returned empty content",
            )
        if cacheable and cache_key is not None:
            _ai_cache_put(cache_key, content)
        return content
