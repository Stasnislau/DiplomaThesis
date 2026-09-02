import logging
import os
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from fastapi import status

from utils.user_context import UserContext
from utils.error_codes import USER_SERVICE_BAD_REQUEST, USER_SERVICE_BAD_RESPONSE, USER_SERVICE_UNAUTHORIZED, USER_SERVICE_UNREACHABLE, USER_TOKENS_EMPTY, raise_with_code

logger = logging.getLogger("ai_microservice")


def _internal_key() -> str:
    key = os.environ.get("INTERNAL_SERVICE_KEY")
    if not key:
        raise RuntimeError(
            "INTERNAL_SERVICE_KEY is not set. AI cannot talk to "
            "the User microservice without it. Set it in your .env "
            "before starting the service.",
        )
    return key


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


class UserErrorEntry(TypedDict, total=False):
    languageCode: str
    errorText: str
    correction: str
    errorType: str
    source: str
    context: Optional[str]


class UserService:
    def __init__(self) -> None:
        self.base_url = os.getenv(
            "USER_MICROSERVICE_URL", "http://localhost:3004/api"
        ).rstrip("/")

    async def _get(
        self, path: str, forward_headers: Dict[str, str]
    ) -> Dict[str, Any]:
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
        headers = ctx.to_forward_headers()
        headers["x-internal-service-key"] = _internal_key()
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
        try:
            url = f"{self.base_url}/history"
            headers = ctx.to_forward_headers()
            headers["x-internal-service-key"] = _internal_key()
            headers["content-type"] = "application/json"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, headers=headers, json=entry)
            if response.status_code >= 400:
                logger.warning(
                    "history log failed status=%s body=%s",
                    response.status_code,
                    response.text[:200],
                )
        except Exception as exc:
            logger.warning("history log exception: %s", exc)

    async def record_user_error(
        self, ctx: UserContext, error: "UserErrorEntry"
    ) -> None:
        try:
            url = f"{self.base_url}/user-errors"
            headers = ctx.to_forward_headers()
            headers["x-internal-service-key"] = _internal_key()
            headers["content-type"] = "application/json"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, headers=headers, json=error)
            if response.status_code >= 400:
                logger.warning(
                    "record_user_error failed status=%s body=%s",
                    response.status_code,
                    response.text[:200],
                )
        except Exception as exc:
            logger.warning("record_user_error exception: %s", exc)

    async def post_achievement_progress(
        self, ctx: UserContext, achievement_name: str, increment_by: int = 1
    ) -> None:
        try:
            url = f"{self.base_url}/achievements/progress"
            headers = ctx.to_forward_headers()
            headers["x-internal-service-key"] = _internal_key()
            headers["content-type"] = "application/json"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json={"achievementName": achievement_name, "incrementBy": increment_by},
                )
            if response.status_code >= 400:
                logger.warning(
                    "achievement progress failed status=%s body=%s",
                    response.status_code,
                    response.text[:200],
                )
        except Exception as exc:
            logger.warning("post_achievement_progress exception: %s", exc)

    async def log_activity(self, ctx: UserContext, xp_gained: int) -> None:
        try:
            url = f"{self.base_url}/me/activity"
            headers = ctx.to_forward_headers()
            headers["x-internal-service-key"] = _internal_key()
            headers["content-type"] = "application/json"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json={"xpGained": xp_gained},
                )
            if response.status_code >= 400:
                logger.warning(
                    "log_activity failed status=%s body=%s",
                    response.status_code,
                    response.text[:200],
                )
        except Exception as exc:
            logger.warning("log_activity exception: %s", exc)

    async def get_recent_history(
        self, ctx: UserContext, limit: int = 20, task_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        headers = ctx.to_forward_headers()
        headers["x-internal-service-key"] = _internal_key()
        path = f"/history?limit={int(limit)}"
        if task_type:
            path += f"&type={task_type}"
        try:
            data = await self._get(path, headers)
        except Exception as exc:
            logger.warning("get_recent_history failed: %s", exc)
            return []

        if not isinstance(data, dict) or not data.get("success"):
            return []

        payload = data.get("payload", [])
        if not isinstance(payload, list):
            return []
        return payload

    async def get_recurring_errors(
        self, ctx: UserContext, language_code: str
    ) -> List[Dict[str, Any]]:
        try:
            headers = ctx.to_forward_headers()
            headers["x-internal-service-key"] = _internal_key()
            data = await self._get(
                f"/user-errors?languageCode={language_code}", headers
            )
        except Exception as exc:
            logger.warning("get_recurring_errors failed: %s", exc)
            return []

        if not isinstance(data, dict) or not data.get("success"):
            return []

        payload = data.get("payload", [])
        if not isinstance(payload, list):
            return []
        return payload

    async def get_default_ai_token(
        self, ctx: UserContext, ai_provider_id: Optional[str] = None
    ) -> UserAIToken:
        tokens = await self.get_ai_tokens(ctx)
        if not tokens:
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

