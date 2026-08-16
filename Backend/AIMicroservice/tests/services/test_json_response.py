import json

import pytest

from utils.json_response import parse_json_object


def test_parses_a_plain_object() -> None:
    assert parse_json_object('{"a": 1}') == {"a": 1}


def test_strips_markdown_fences() -> None:
    raw = """```json
{"question": "She ____ home."}
```"""
    assert parse_json_object(raw)["question"] == "She ____ home."


def test_extracts_an_object_buried_in_prose() -> None:
    raw = 'Sure, here you go:\n{"ok": true}\nThanks.'
    assert parse_json_object(raw) == {"ok": True}


def test_empty_response_raises() -> None:
    with pytest.raises(json.JSONDecodeError):
        parse_json_object("   ")
