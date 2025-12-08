from dataclasses import dataclass
from typing import Dict, Optional

from fastapi import HTTPException, Request, status


@dataclass
class UserContext:
    user_id: str
    user_email: Optional[str]
    user_role: Optional[str]
    authorization: Optional[str]

    def to_forward_headers(self) -> Dict[str, str]:
        """Headers we forward to the User microservice so it can authorize/identify the user."""
        headers: Dict[str, str] = {}
        if self.authorization:
            headers["authorization"] = self.authorization
        if self.user_id:
            headers["x-user-id"] = self.user_id
        if self.user_email:
            headers["x-user-email"] = self.user_email
        if self.user_role:
            headers["x-user-role"] = self.user_role
        return headers


def extract_user_context(request: Request) -> UserContext:
    user_id = request.headers.get("x-user-id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user identifier in headers",
        )

    return UserContext(
        user_id=user_id,
        user_email=request.headers.get("x-user-email"),
        user_role=request.headers.get("x-user-role"),
        authorization=request.headers.get("authorization"),
    )

