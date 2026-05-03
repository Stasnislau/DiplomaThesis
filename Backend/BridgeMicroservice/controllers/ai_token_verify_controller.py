"""Endpoint that pings an AI provider with a tiny request to confirm a key works.

Two call shapes:
  - {tokenId}                      → look up the saved token via user-service
                                      (uses INTERNAL_SERVICE_KEY to read raw value)
  - {aiProviderId, token}          → verify a freshly-typed key before save

Returned shape never throws on bad-key — we always return success=true and
encode validity in `payload.valid`. That keeps the frontend free of
exception-handling for an expected-no-result case.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from litellm import acompletion
from litellm.exceptions import (
    AuthenticationError,
    RateLimitError,
    Timeout,
    BadRequestError,
)

from models.base_response import BaseResponse
from services.ai_service import PROVIDER_CONFIG
from services.user_service import UserService
from utils.user_context import extract_user_context

logger = logging.getLogger(__name__)


class VerifyAITokenRequest(BaseModel):
    ai_provider_id: Optional[str] = Field(default=None, alias="aiProviderId")
    token: Optional[str] = None
    token_id: Optional[str] = Field(default=None, alias="tokenId")

    model_config = {"populate_by_name": True}


class VerifyAITokenResponse(BaseModel):
    valid: bool
    provider: str
    message: str


def _result(valid: bool, provider: str, message: str) -> BaseResponse[VerifyAITokenResponse]:
    return BaseResponse[VerifyAITokenResponse](
        success=True,
        payload=VerifyAITokenResponse(valid=valid, provider=provider, message=message),
    )


class AITokenVerifyController:
    def __init__(self) -> None:
        self.router = APIRouter(prefix="/ai-tokens", tags=["AI Tokens"])
        self.user_service = UserService()
        self._setup_routes()

    def get_router(self) -> APIRouter:
        return self.router

    async def _resolve_credentials(
        self, payload: VerifyAITokenRequest, request: Request
    ) -> tuple[str, str]:
        """Return (aiProviderId, token) regardless of which input shape was used."""
        if payload.token and payload.token.strip() and payload.ai_provider_id:
            return payload.ai_provider_id, payload.token.strip()

        if payload.token_id:
            ctx = extract_user_context(request)
            tokens = await self.user_service.get_ai_tokens(ctx)
            for tok in tokens:
                if tok.get("id") == payload.token_id:
                    raw_token = tok.get("token")
                    provider = tok.get("aiProviderId")
                    if not raw_token or not provider:
                        raise HTTPException(
                            status_code=400,
                            detail="Token row is missing token or provider",
                        )
                    return provider, raw_token
            raise HTTPException(
                status_code=404,
                detail=f"Token id {payload.token_id} not found for this user",
            )

        raise HTTPException(
            status_code=400,
            detail="Provide either tokenId, or aiProviderId + token",
        )

    def _setup_routes(self) -> None:
        @self.router.post(
            "/verify",
            response_model=BaseResponse[VerifyAITokenResponse],
        )
        async def verify_token(
            request: Request,
            payload: VerifyAITokenRequest,
        ) -> BaseResponse[VerifyAITokenResponse]:
            provider, raw_token = await self._resolve_credentials(payload, request)

            provider_config = PROVIDER_CONFIG.get(provider)
            if not provider_config:
                return _result(False, provider, f"Unsupported provider: {provider}")

            litellm_model = provider_config["model"]
            extra_params = {
                k: v for k, v in provider_config.items() if k != "model"
            }
            extra_params["api_key"] = raw_token

            try:
                # Tiny ping — 1 token reply, short prompt, low timeout.
                await acompletion(
                    model=litellm_model,
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=1,
                    timeout=15,
                    temperature=0.0,
                    **extra_params,
                )
            except AuthenticationError as exc:
                logger.info(
                    "Verify failed (auth) for provider=%s: %s",
                    provider,
                    str(exc)[:150],
                )
                return _result(False, provider, "Invalid or expired API key")
            except RateLimitError:
                # Rate-limit means the key is RECOGNISED — still valid.
                return _result(
                    True,
                    provider,
                    "Key is valid (rate-limited right now, but accepted)",
                )
            except Timeout:
                return _result(False, provider, "Provider did not respond in time")
            except BadRequestError as exc:
                # litellm sometimes wraps auth failures (incl. revoked Groq keys)
                # as BadRequestError. Inspect the message for auth signals; only
                # treat as 'valid' when the body explicitly says model issue.
                msg = str(exc).lower()
                logger.info(
                    "Verify got BadRequest for provider=%s: %s",
                    provider,
                    str(exc)[:200],
                )
                auth_markers = (
                    "invalid api key",
                    "incorrect api key",
                    "unauthorized",
                    "authentication",
                    "401",
                    "expired",
                    "revoked",
                    "no auth credentials",
                )
                if any(m in msg for m in auth_markers):
                    return _result(
                        False,
                        provider,
                        "Invalid or expired API key",
                    )
                # Genuinely a model/parameter issue (not auth) — surface verbatim.
                return _result(
                    False,
                    provider,
                    f"Provider rejected the request: {str(exc)[:120]}",
                )
            except Exception as exc:
                # Catch-all: be conservative, mark invalid. False negatives are
                # better than false positives for a security-sensitive check.
                logger.exception("Unexpected verify error for provider=%s", provider)
                msg = str(exc)
                return _result(
                    False,
                    provider,
                    f"Verification failed: {msg[:150]}",
                )

            return _result(True, provider, "Key is valid")
