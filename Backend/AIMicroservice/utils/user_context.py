import logging
import os
from dataclasses import dataclass
from typing import Dict, Optional

import jwt
from fastapi import Request, status

logger = logging.getLogger("ai_microservice")


LOCALE_TO_LABEL: Dict[str, str] = {
    "en": "English",
    "pl": "Polish",
    "es": "Spanish",
    "ru": "Russian",
    "fr": "French",
    "de": "German",
    "it": "Italian",
}


@dataclass
class UserContext:
    user_id: str
    user_email: Optional[str]
    user_role: Optional[str]
    authorization: Optional[str]
    ui_locale: str = "en"

    def to_forward_headers(self) -> Dict[str, str]:
        """Identity the User microservice needs on an internal call.

        The learner's own bearer token stays here: User resolves the caller
        from these headers once the shared service key has opened the route,
        so forwarding the token would spread a credential no one reads.
        """
        headers: Dict[str, str] = {}
        if self.user_id:
            headers["x-user-id"] = self.user_id
        if self.user_email:
            headers["x-user-email"] = self.user_email
        if self.user_role:
            headers["x-user-role"] = self.user_role
        return headers

    @property
    def ui_locale_label(self) -> str:
        """Human-readable language name for the UI locale (used in prompts)."""
        return LOCALE_TO_LABEL.get(
            (self.ui_locale or "en").split("-")[0].lower(), "English"
        )


def _verified_user_id_from_jwt(authorization: Optional[str]) -> Optional[str]:
    """Decode the gateway-forwarded Bearer token with our shared
    JWT_SECRET. Returns the `sub` claim on success, or None if the
    header is missing/malformed/invalid.

    Without this, AI trusts whatever value the upstream sends in
    `X-User-Id` — fine when the only ingress is the gateway, but a
    one-off port exposure is enough to forge identity.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        logger.error("JWT_SECRET is not set; refusing unverified request.")
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        logger.info("JWT verification failed: %s", exc)
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


def extract_user_context(request: Request) -> UserContext:
    from utils.error_codes import (
        AUTH_INVALID_TOKEN,
        AUTH_MISSING_USER,
        raise_with_code,
    )

    authorization = request.headers.get("authorization")
    header_user_id = request.headers.get("x-user-id")
    verified_user_id = _verified_user_id_from_jwt(authorization)

    if verified_user_id:
        if header_user_id and header_user_id != verified_user_id:
            logger.warning(
                "X-User-Id (%s) ≠ JWT sub (%s); rejecting as forged",
                header_user_id,
                verified_user_id,
            )
            raise_with_code(
                AUTH_INVALID_TOKEN,
                status.HTTP_401_UNAUTHORIZED,
                "Identity header does not match the JWT subject",
            )
        user_id: Optional[str] = verified_user_id
    else:
        internal_key_header = request.headers.get("x-internal-service-key")
        expected_key = os.environ.get("INTERNAL_SERVICE_KEY")
        if (
            internal_key_header
            and expected_key
            and internal_key_header == expected_key
        ):
            user_id = header_user_id
        else:
            user_id = None

    if not user_id:
        raise_with_code(
            AUTH_MISSING_USER,
            status.HTTP_401_UNAUTHORIZED,
            "Missing or invalid user identifier",
        )

    raw_locale = (
        request.headers.get("x-ui-locale")
        or request.query_params.get("uiLocale")
        or "en"
    )

    return UserContext(
        user_id=user_id,
        user_email=request.headers.get("x-user-email"),
        user_role=request.headers.get("x-user-role"),
        authorization=authorization,
        ui_locale=raw_locale,
    )

