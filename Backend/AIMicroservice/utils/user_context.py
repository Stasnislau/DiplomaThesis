import logging
from dataclasses import dataclass
from typing import Dict, Optional

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


def extract_user_context(request: Request) -> UserContext:
    """Read the caller identity the gateway attached to this request.

    The gateway validates the token with Auth, attaches the identity, and
    strips any incoming x-internal-service-key. It is the only service that
    publishes a port, so these headers cannot be set from outside.
    """
    from utils.error_codes import AUTH_MISSING_USER, raise_with_code

    authorization = request.headers.get("authorization")
    user_id = request.headers.get("x-user-id")

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

