import os
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from fastapi import HTTPException, status

from utils.user_context import UserContext


class UserAIToken(TypedDict, total=False):
    id: str
    userId: str
    token: str
    aiProviderId: str
    isDefault: bool


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
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to reach user service: {exc}",
            ) from exc

        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized when contacting user service",
            )

        if response.status_code >= 500:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="User service unavailable",
            )

        if not response.is_success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User service error: {response.text}",
            )

        try:
            response.raise_for_status()
            return response.json()  # type: ignore[no-any-return]
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="User service returned invalid JSON",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"User service error: {exc.response.text}",
            ) from exc

    async def get_ai_tokens(self, ctx: UserContext) -> List[UserAIToken]:
        headers = ctx.to_forward_headers()
        headers["x-internal-service-key"] = os.getenv("INTERNAL_SERVICE_KEY", "supersecretbridgekey")
        data = await self._get("/ai-tokens", headers)

        if not isinstance(data, dict) or not data.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch AI tokens for user",
            )

        payload = data.get("payload", [])
        if not isinstance(payload, list):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid AI tokens payload shape",
            )

        return payload

    async def get_default_ai_token(
        self, ctx: UserContext, ai_provider_id: Optional[str] = None
    ) -> UserAIToken:
        tokens = await self.get_ai_tokens(ctx)
        if not tokens:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No AI tokens configured for user",
            )

        if ai_provider_id:
            for token in tokens:
                if token.get("aiProviderId") == ai_provider_id:
                    return token

        for token in tokens:
            if token.get("isDefault"):
                return token

        return tokens[0]

