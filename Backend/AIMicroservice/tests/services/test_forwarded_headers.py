from utils.user_context import UserContext


def _ctx(**overrides):
    payload = {
        "user_id": "user-123",
        "user_email": "demo@a.ai",
        "user_role": "USER",
        "authorization": "Bearer learner.jwt.value",
    }
    payload.update(overrides)
    return UserContext(**payload)


def test_the_learner_token_is_never_forwarded():
    headers = _ctx().to_forward_headers()
    assert "authorization" not in headers
    assert not any("Bearer" in value for value in headers.values())


def test_the_identity_headers_are_still_forwarded():
    headers = _ctx().to_forward_headers()
    assert headers["x-user-id"] == "user-123"
    assert headers["x-user-email"] == "demo@a.ai"
    assert headers["x-user-role"] == "USER"


def test_absent_fields_produce_no_header():
    headers = _ctx(user_email=None, user_role=None).to_forward_headers()
    assert set(headers) == {"x-user-id"}
