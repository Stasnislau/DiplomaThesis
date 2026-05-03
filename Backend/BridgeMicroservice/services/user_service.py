import logging
import os
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from fastapi import status

from utils.user_context import UserContext

logger = logging.getLogger("bridge_microservice")


class UserAIToken(TypedDict, total=False):
    id: str
    userId: str
    token: str
    aiProviderId: str
    isDefault: bool


class TaskHistoryEntry(TypedDict, total=False):
    taskType: str
    title: str
    score: Optional[int]
    language: Optional[str]
    metadata: Optional[Dict[str, Any]]


class UserService:
    def __init__(self) -> None:
        self.base_url = os.getenv(
            "USER_MICROSERVICE_URL", "http://localhost:3004/api"
        ).rstrip("/")

    async def _get(
        self, path: str, forward_headers: Dict[str, str]
    ) -> Dict[str, Any]:
        from utils.error_codes import (
            USER_SERVICE_UNREACHABLE,
            USER_SERVICE_UNAUTHORIZED,
            USER_SERVICE_BAD_RESPONSE,
            USER_SERVICE_BAD_REQUEST,
            raise_with_code,
        )
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=forward_headers)
        except httpx.RequestError as exc:
            raise_with_code(
                USER_SERVICE_UNREACHABLE,
                status.HTTP_502_BAD_GATEWAY,
                f"Failed to reach user service: {exc}",
            )

        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            raise_with_code(
                USER_SERVICE_UNAUTHORIZED,
                status.HTTP_401_UNAUTHORIZED,
                "Unauthorized when contacting user service",
            )

        if response.status_code >= 500:
            raise_with_code(
                USER_SERVICE_UNREACHABLE,
                status.HTTP_502_BAD_GATEWAY,
                "User service unavailable",
            )

        if not response.is_success:
            raise_with_code(
                USER_SERVICE_BAD_REQUEST,
                status.HTTP_400_BAD_REQUEST,
                f"User service error: {response.text}",
            )

        try:
            response.raise_for_status()
            return response.json()  # type: ignore[no-any-return]
        except ValueError:
            raise_with_code(
                USER_SERVICE_BAD_RESPONSE,
                status.HTTP_502_BAD_GATEWAY,
                "User service returned invalid JSON",
            )
        except httpx.HTTPStatusError as exc:
            raise_with_code(
                USER_SERVICE_BAD_REQUEST,
                exc.response.status_code,
                f"User service error: {exc.response.text}",
            )

    async def get_ai_tokens(self, ctx: UserContext) -> List[UserAIToken]:
        from utils.error_codes import (
            USER_SERVICE_BAD_REQUEST,
            USER_SERVICE_BAD_RESPONSE,
            raise_with_code,
        )
        headers = ctx.to_forward_headers()
        headers["x-internal-service-key"] = os.getenv("INTERNAL_SERVICE_KEY", "supersecretbridgekey")
        data = await self._get("/ai-tokens", headers)

        if not isinstance(data, dict) or not data.get("success"):
            raise_with_code(
                USER_SERVICE_BAD_REQUEST,
                status.HTTP_400_BAD_REQUEST,
                "Failed to fetch AI tokens for user",
            )

        payload = data.get("payload", [])
        if not isinstance(payload, list):
            raise_with_code(
                USER_SERVICE_BAD_RESPONSE,
                status.HTTP_502_BAD_GATEWAY,
                "Invalid AI tokens payload shape",
            )

        return payload

    async def log_task_history(
        self, ctx: UserContext, entry: TaskHistoryEntry
    ) -> None:
        """Best-effort POST to /api/history. Never raises — history logging
        must not block or fail the actual user-facing operation.
        """
        try:
            url = f"{self.base_url}/history"
            headers = ctx.to_forward_headers()
            headers["x-internal-service-key"] = os.getenv(
                "INTERNAL_SERVICE_KEY", "supersecretbridgekey"
            )
            headers["content-type"] = "application/json"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, headers=headers, json=entry)
            if response.status_code >= 400:
                logger.warning(
                    "history log failed status=%s body=%s",
                    response.status_code,
                    response.text[:200],
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("history log exception: %s", exc)

    async def get_default_ai_token(
        self, ctx: UserContext, ai_provider_id: Optional[str] = None
    ) -> UserAIToken:
        tokens = await self.get_ai_tokens(ctx)
        if not tokens:
            from utils.error_codes import USER_TOKENS_EMPTY, raise_with_code
            raise_with_code(
                USER_TOKENS_EMPTY,
                status.HTTP_400_BAD_REQUEST,
                "No AI tokens configured for user",
            )

        if ai_provider_id:
            for token in tokens:
                if token.get("aiProviderId") == ai_provider_id:
                    return token

        for token in tokens:
            if token.get("isDefault"):
                return token

        return tokens[0]

