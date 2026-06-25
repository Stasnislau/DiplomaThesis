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


# Retry tunables. Free OpenRouter endpoints in particular hand out
# "no endpoints found" / 502 / timeout when capacity is exhausted —
# usually transient, gone in a second or two. Three attempts with
# exp-backoff + jitter is enough to ride out those blips without
# making the user wait forever.
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
        # OpenRouter signals "free model at capacity" with a 404 body
        # like {"error":{"message":"No endpoints found for X"}}. That
        # IS transient — a retry usually finds a free slot.
        return "no endpoints" in str(exc).lower()
    if isinstance(exc, AuthenticationError):
        return False
    if isinstance(exc, BadRequestError):
        return False
    if isinstance(exc, HTTPException):
        return False
    # Treat any other exception (network, 5xx, unexpected) as worth
    # one or two retries before giving up.
    return True


# In-process AI response cache. Two motivations:
#   1) Cost — repeated calls with identical inputs don't bill the
#      provider twice. A user re-clicking 'Generate' or two parallel
#      requests for the same placement-task-with-same-seed share a
#      single completion.
#   2) Latency — Groq cold paths can spike 5-10s; warm cache hit is
#      microseconds.
# Notes / caveats:
#   - This is per-process. With a single AI-service replica that's fine;
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
    "google-geminis": {"model": "vertex_ai/gemini-2.5-flash"},
    "mistral": {"model": "mistral/mistral-large-latest"},
    "claude": {"model": "anthropic/claude-haiku-4-5-20251001"},
    "deepseek": {
        "model": "deepseek/deepseek-chat",
        "api_base": "https://api.deepseek.com",
    },
    "groq": {"model": "groq/llama-3.3-70b-versatile"},
    # OpenRouter is the meta-router that fronts every other lab. The
    # default routes to Sonnet 4.6 (best quality/$ ratio at 1M ctx),
    # but the model is overridable via OPENROUTER_MODEL so swapping to
    # opus-4.7 / gpt-5.4 / a :free model takes one env var, no rebuild.
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
        extra_params = {k: v for k, v in provider_config.items() if k != "model"}
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

    async def get_ai_response(
        self, 
        prompt: str, 
        model: str = "vertex_ai/gemini-2.5-flash",
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

        chat_response = None
        last_exc: Optional[BaseException] = None
        for attempt in range(1, _AI_RETRY_MAX_ATTEMPTS + 1):
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
                if attempt > 1:
                    logger.info(
                        "AI call succeeded on retry %d/%d (model=%s)",
                        attempt,
                        _AI_RETRY_MAX_ATTEMPTS,
                        litellm_model,
                    )
                break
            except HTTPException:
                raise
            except BaseException as exc:
                last_exc = exc
                if attempt >= _AI_RETRY_MAX_ATTEMPTS or not _is_retryable(exc):
                    break
                # Exp backoff with full jitter so simultaneous retries
                # from concurrent requests don't synchronise into a
                # thundering herd at the upstream.
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

        if chat_response is None:
            # All attempts exhausted — translate the last exception to
            # a structured HTTP error using the same mapping as before.
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
