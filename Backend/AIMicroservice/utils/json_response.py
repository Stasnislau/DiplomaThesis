
from __future__ import annotations

import json
import re
from typing import Any, Dict


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)
_OBJECT = re.compile(r"\{.*\}", re.DOTALL)


def parse_json_object(text: str) -> Dict[str, Any]:
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
