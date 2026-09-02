import logging
from dataclasses import dataclass
from typing import Dict, Optional

from fastapi import Request, status
from utils.error_codes import AUTH_MISSING_USER, raise_with_code

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
        return LOCALE_TO_LABEL.get(
            (self.ui_locale or "en").split("-")[0].lower(), "English"
        )


def extract_user_context(request: Request) -> UserContext:

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

