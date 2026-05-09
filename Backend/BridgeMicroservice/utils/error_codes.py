"""Stable, machine-readable codes for every HTTPException Bridge raises.

Why we have this:

  Without structured codes, the frontend either had to keyword-match
  free-form English (brittle) or show the raw English to a Polish /
  Spanish user (ugly). With every failure carrying a `code` field the
  frontend can branch on it, look up a localized string, and the
  English `message` stays as a fallback for codes the UI doesn't know
  yet.

Wire format (since the structured-error refactor):

    HTTPException(detail={"code": "<CODE>", "message": "<msg>"},
                  status_code=<int>)

FastAPI emits this verbatim as `{"detail": {"code": ..., "message": ...}}`
so the frontend reads `detail.code` directly — no string parsing.

Adding a new code:

    1. Add a new constant below in the matching section.
    2. Add a translation key `errors.codes.<CODE>` in
       Frontend/src/config/i18n.ts under all locales.
    3. Use raise_with_code() at the call site.

Don't reuse codes for different conditions — readers grep for them.
"""
from typing import NoReturn

from fastapi import HTTPException


# ── Auth & user context ────────────────────────────────────────────
AUTH_MISSING_USER = "AUTH_MISSING_USER"
AUTH_INVALID_TOKEN = "AUTH_INVALID_TOKEN"

# ── Generic input ──────────────────────────────────────────────────
INPUT_VALIDATION_FAILED = "INPUT_VALIDATION_FAILED"

# ── File / upload ──────────────────────────────────────────────────
FILE_NAME_REQUIRED = "FILE_NAME_REQUIRED"
FILE_TYPE_PDF_ONLY = "FILE_TYPE_PDF_ONLY"
PDF_NO_TEXT = "PDF_NO_TEXT"
PDF_GARBLED_TEXT = "PDF_GARBLED_TEXT"
PDF_AI_REJECTED = "PDF_AI_REJECTED"
FILE_PROCESSING_FAILED = "FILE_PROCESSING_FAILED"

# ── Materials / Quiz ───────────────────────────────────────────────
MATERIALS_NO_RELEVANT = "MATERIALS_NO_RELEVANT"

# ── AI provider (litellm passthrough) ──────────────────────────────
AI_PROVIDER_UNSUPPORTED = "AI_PROVIDER_UNSUPPORTED"
AI_API_KEY_MISSING = "AI_API_KEY_MISSING"
AI_AUTH_FAILED = "AI_AUTH_FAILED"
AI_RATE_LIMITED = "AI_RATE_LIMITED"
AI_TIMEOUT = "AI_TIMEOUT"
AI_BAD_GATEWAY = "AI_BAD_GATEWAY"
AI_EMPTY_RESPONSE = "AI_EMPTY_RESPONSE"
AI_RESPONSE_PARSE_FAILED = "AI_RESPONSE_PARSE_FAILED"

# ── Speaking / Whisper ─────────────────────────────────────────────
SPEAKING_NO_AUDIO = "SPEAKING_NO_AUDIO"
SPEAKING_GROQ_KEY_MISSING = "SPEAKING_GROQ_KEY_MISSING"
SPEAKING_TRANSCRIBE_FAILED = "SPEAKING_TRANSCRIBE_FAILED"
SPEAKING_TRANSCRIBE_PROVIDER_ERROR = "SPEAKING_TRANSCRIBE_PROVIDER_ERROR"
SPEAKING_FEEDBACK_PARSE_FAILED = "SPEAKING_FEEDBACK_PARSE_FAILED"
SPEAKING_FEEDBACK_FAILED = "SPEAKING_FEEDBACK_FAILED"

# ── Task generation ────────────────────────────────────────────────
TASK_INVALID_LEVEL = "TASK_INVALID_LEVEL"
TASK_VALIDATION_FAILED = "TASK_VALIDATION_FAILED"
TASK_GENERATION_FAILED = "TASK_GENERATION_FAILED"

# ── Placement ──────────────────────────────────────────────────────
PLACEMENT_GENERATION_FAILED = "PLACEMENT_GENERATION_FAILED"
PLACEMENT_EVALUATION_FAILED = "PLACEMENT_EVALUATION_FAILED"

# ── User microservice (Bridge -> User) ─────────────────────────────
USER_SERVICE_UNREACHABLE = "USER_SERVICE_UNREACHABLE"
USER_SERVICE_UNAUTHORIZED = "USER_SERVICE_UNAUTHORIZED"
USER_SERVICE_BAD_RESPONSE = "USER_SERVICE_BAD_RESPONSE"
USER_SERVICE_BAD_REQUEST = "USER_SERVICE_BAD_REQUEST"
USER_TOKENS_EMPTY = "USER_TOKENS_EMPTY"


def raise_with_code(
    code: str, status_code: int, message: str
) -> NoReturn:
    """Raise an HTTPException with a structured `{code, message}` body.

    FastAPI surfaces this verbatim as `{"detail": {"code": ...,
    "message": ...}}` — clients read `detail.code` directly, no string
    parsing. The English `message` stays as a fallback for any code
    the frontend hasn't translated yet.
    """
    raise HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message},
    )
