"""Parse JSON objects out of model replies that are almost JSON.

Providers asked for `response_format=json_object` still wrap the
object in markdown fences or add a sentence around it. Callers that
`json.loads` the raw string then 500 a perfectly usable task.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)
_OBJECT = re.compile(r"\{.*\}", re.DOTALL)


def parse_json_object(text: str) -> Dict[str, Any]:
    """Return the first JSON object in `text`.

    Strips markdown fences, then tries a straight parse, then a greedy
    `{...}` extract. Raises `json.JSONDecodeError` when nothing usable
    is there — same exception `json.loads` would have raised.
    """
    cleaned = _FENCE.sub("", (text or "").strip()).strip()
    if not cleaned:
        raise json.JSONDecodeError("empty AI response", text or "", 0)
    try:
        parsed: Any = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    match = _OBJECT.search(cleaned)
    if not match:
        raise json.JSONDecodeError(
            "no JSON object in AI response", cleaned, 0
        )
    parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise json.JSONDecodeError(
            "AI response JSON was not an object", cleaned, 0
        )
    return parsed
