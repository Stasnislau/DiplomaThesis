import asyncio
import hashlib
import json
import logging
import os
import random
import time

from dotenv import load_dotenv
from fastapi import HTTPException, status
from litellm import acompletion
from litellm.exceptions import (
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    RateLimitError,
    Timeout,
)
from typing import Optional, Union, Dict, Any, Tuple

from services.user_service import UserService
from utils.user_context import UserContext

logger = logging.getLogger(__name__)

load_dotenv()


_AI_RETRY_MAX_ATTEMPTS = 3
_AI_RETRY_BASE_DELAY_S = 1.0
_AI_RETRY_MAX_DELAY_S = 8.0


def _is_retryable(exc: BaseException) -> bool:
    """Decide whether an AI provider error is worth retrying.

    Retry: timeouts, rate-limits, capacity-exhausted (NotFound on free
    tier endpoints), and generic upstream errors (5xx / network).
    Never retry: auth failures (key won't change between attempts) and
    BadRequest unless it's the capacity-style 'no endpoints' marker.
    """
    if isinstance(exc, (Timeout, RateLimitError)):
        return True
    if isinstance(exc, NotFoundError):
        return "no endpoints" in str(exc).lower()
    if isinstance(exc, AuthenticationError):
        return False
    if isinstance(exc, BadRequestError):
        return False
    if isinstance(exc, HTTPException):
        return False
    return True


_AI_CACHE_TTL = 60 * 10
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


VERTEX_CHAT_MODEL = os.getenv("VERTEX_CHAT_MODEL", "vertex_ai/gemini-3-flash-preview")
# Gemini 3 Flash is a global publisher model. VERTEX_AI_LOCATION stays
# us-central1 for Imagen; chat must not inherit that or Vertex answers 404.
VERTEX_CHAT_LOCATION = os.getenv("VERTEX_CHAT_LOCATION", "global")

# The provider a request falls back to when the one the learner selected fails
# for its whole retry budget (UC7 alternative flow 3a).
_DEFAULT_PROVIDER_ID = "google-geminis"


def _google_geminis_config() -> Dict[str, Any]:
    config: Dict[str, Any] = {
        "model": VERTEX_CHAT_MODEL,
        "vertex_location": VERTEX_CHAT_LOCATION,
    }
    project = os.getenv("VERTEX_AI_PROJECT_ID") or os.getenv("VERTEXAI_PROJECT")
    if project:
        config["vertex_project"] = project
    return config


PROVIDER_CONFIG: Dict[str, Dict[str, Any]] = {
    "openai": {"model": "gpt-5.2"},
    "google-geminis": _google_geminis_config(),
    "mistral": {"model": "mistral/mistral-large-latest"},
    "claude": {"model": "anthropic/claude-sonnet-4.6"},
    "deepseek": {
        "model": "deepseek/deepseek-chat",
        "api_base": "https://api.deepseek.com",
    },
    "groq": {"model": "groq/openai/gpt-oss-120b"},
    "openrouter": {
        "model": os.getenv(
            "OPENROUTER_MODEL", "openrouter/anthropic/claude-sonnet-4.6"
        ),
        "api_base": "https://openrouter.ai/api/v1",
    },
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
        extra_params = {
            k: v for k, v in provider_config.items() if k != "model" and v is not None
        }
        uses_adc = model.startswith("vertex_ai/")
        if api_key:
            extra_params["api_key"] = api_key
        elif require_api_key and not uses_adc:
            raise_with_code(
                AI_API_KEY_MISSING,
                status.HTTP_400_BAD_REQUEST,
                "AI API key is missing for the selected provider",
            )
        return model, extra_params

    async def _complete_with_retries(
        self,
        litellm_model: str,
        litellm_params: Dict[str, Any],
        messages: list,
        response_format: Optional[Dict[str, str]],
        temperature: float,
    ) -> Tuple[Any, Optional[BaseException]]:
        """Call one provider up to _AI_RETRY_MAX_ATTEMPTS times.

        Returns the response and None on success, or None and the last
        exception when every attempt failed. Errors raised by this service
        itself keep propagating, because a retry cannot change them.
        """
        last_exc: Optional[BaseException] = None
        for attempt in range(1, _AI_RETRY_MAX_ATTEMPTS + 1):
            try:
                chat_response = await acompletion(
                    model=litellm_model,
                    messages=messages,
                    response_format=response_format,
                    timeout=180,
                    temperature=temperature,
                    **litellm_params,
                )
                if attempt > 1:
                    logger.info(
                        "AI call succeeded on retry %d/%d (model=%s)",
                        attempt,
                        _AI_RETRY_MAX_ATTEMPTS,
                        litellm_model,
                    )
                return chat_response, None
            except HTTPException:
                raise
            except BaseException as exc:
                last_exc = exc
                if attempt >= _AI_RETRY_MAX_ATTEMPTS or not _is_retryable(exc):
                    break
                base = min(
                    _AI_RETRY_MAX_DELAY_S,
                    _AI_RETRY_BASE_DELAY_S * (2 ** (attempt - 1)),
                )
                delay = random.uniform(0.0, base)
                logger.warning(
                    "AI call attempt %d/%d failed (%s: %s); retrying in %.2fs",
                    attempt,
                    _AI_RETRY_MAX_ATTEMPTS,
                    type(exc).__name__,
                    str(exc)[:200],
                    delay,
                )
                await asyncio.sleep(delay)
        return None, last_exc

    async def get_ai_response(
        self,
        prompt: str,
        model: str = VERTEX_CHAT_MODEL,
        response_format: Optional[Dict[str, str]] = {"type": "json_object"},
        system_prompt: str = "You are a philologist with over 20 years of experience in language education.",
        user_context: Optional[UserContext] = None,
        ai_provider_id: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        litellm_model = model
        litellm_params: Dict[str, Any] = {}

        token = None
        if user_context:
            try:
                token = await self.user_service.get_default_ai_token(
                    user_context, ai_provider_id=ai_provider_id
                )
            except Exception as exc:  # noqa: BLE001
                # A learner who has stored no key of their own still gets a
                # task: the call falls through to the system key below. Only
                # a learner-supplied key that fails should surface an error.
                logger.info("no stored token for this learner, using the system key: %s", exc)
        if token:
            litellm_model, litellm_params = self._resolve_provider_params(
                token.get("aiProviderId", _DEFAULT_PROVIDER_ID),
                token.get("token"),
                require_api_key=True,
            )
        else:
            litellm_model, litellm_params = self._resolve_provider_params(
                ai_provider_id or _DEFAULT_PROVIDER_ID,
                api_key=None,
                require_api_key=False,
            )

        if model and not user_context and ai_provider_id is None:
            litellm_model = model

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

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]
        chat_response, last_exc = await self._complete_with_retries(
            litellm_model, litellm_params, messages, response_format, temperature
        )

        # UC7 alternative flow 3a: a provider the learner selected can fail for
        # the whole retry budget. The request then runs once more on the system
        # default instead of failing, and only a second failure reaches the
        # learner. A call already on the default has nowhere to fall back to.
        if chat_response is None and token:
            fallback_model, fallback_params = self._resolve_provider_params(
                _DEFAULT_PROVIDER_ID, api_key=None, require_api_key=False
            )
            if fallback_model != litellm_model:
                logger.warning(
                    "provider %s failed after %d attempts (%s); falling back to %s",
                    litellm_model,
                    _AI_RETRY_MAX_ATTEMPTS,
                    type(last_exc).__name__,
                    fallback_model,
                )
                fallback_response, fallback_exc = await self._complete_with_retries(
                    fallback_model,
                    fallback_params,
                    messages,
                    response_format,
                    temperature,
                )
                if fallback_response is not None:
                    chat_response = fallback_response
                    litellm_model = fallback_model
                    # The cache key names the provider the learner asked for,
                    # so an answer from the default must not be stored under it.
                    cache_key = None
                else:
                    last_exc = fallback_exc or last_exc

        if chat_response is None:
            exc = last_exc
            if isinstance(exc, AuthenticationError):
                from utils.error_codes import AI_AUTH_FAILED, raise_with_code
                logger.error("Invalid API key for model %s", litellm_model)
                raise_with_code(
                    AI_AUTH_FAILED,
                    status.HTTP_401_UNAUTHORIZED,
                    "Invalid or expired API key for the selected AI provider",
                )
            if isinstance(exc, RateLimitError):
                from utils.error_codes import AI_RATE_LIMITED, raise_with_code
                logger.warning("Rate limit hit for model %s", litellm_model)
                raise_with_code(
                    AI_RATE_LIMITED,
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "AI provider rate limit exceeded, please try again later",
                )
            if isinstance(exc, Timeout):
                from utils.error_codes import AI_TIMEOUT, raise_with_code
                logger.warning("Timeout calling model %s", litellm_model)
                raise_with_code(
                    AI_TIMEOUT,
                    status.HTTP_504_GATEWAY_TIMEOUT,
                    "AI provider did not respond in time",
                )
            from utils.error_codes import AI_BAD_GATEWAY, raise_with_code
            logger.exception(
                "Unexpected error from AI provider after %d attempts: %s",
                _AI_RETRY_MAX_ATTEMPTS,
                exc,
            )
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
