"""The AI service takes the caller identity from the headers the gateway
attached. The gateway is the only service that publishes a port, so nothing
outside can set them, and no second check happens here."""

import pytest
from fastapi import HTTPException

from utils.user_context import extract_user_context


class _Request:
    def __init__(self, headers: dict, query: dict | None = None) -> None:
        self.headers = headers
        self.query_params = query or {}


def test_the_identity_comes_from_the_headers():
    ctx = extract_user_context(
        _Request(
            {
                "authorization": "Bearer learner.jwt.value",
                "x-user-id": "user-123",
                "x-user-email": "demo@a.ai",
                "x-user-role": "USER",
            }
        )
    )
    assert ctx.user_id == "user-123"
    assert ctx.user_email == "demo@a.ai"
    assert ctx.user_role == "USER"
    assert ctx.authorization == "Bearer learner.jwt.value"


def test_a_request_without_the_identity_header_is_refused():
    with pytest.raises(HTTPException) as excinfo:
        extract_user_context(_Request({"authorization": "Bearer learner.jwt.value"}))
    assert excinfo.value.status_code == 401


def test_no_bearer_token_is_needed_on_an_internal_call():
    ctx = extract_user_context(_Request({"x-user-id": "user-123"}))
    assert ctx.user_id == "user-123"
    assert ctx.authorization is None


def test_the_ui_locale_falls_back_to_english():
    assert extract_user_context(_Request({"x-user-id": "u"})).ui_locale == "en"
    assert (
        extract_user_context(_Request({"x-user-id": "u", "x-ui-locale": "pl"})).ui_locale
        == "pl"
    )
    assert (
        extract_user_context(_Request({"x-user-id": "u"}, {"uiLocale": "es"})).ui_locale
        == "es"
    )
