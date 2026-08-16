"""Cheap, deterministic checks on generated language tasks.

A live model will happily return a multiple-choice whose correct
answer is the letter "C", a fill-in whose answer already sits in the
stem, or a question with no gap at all. None of that needs a second
LLM to catch — and catching it here lets the generator retry before
the learner sees a broken exercise.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Sequence


BLANK_RE = re.compile(r"_{2,}|\.{3,}|…")
_GLOSS = re.compile(r"\([^)]*\)")
_LETTER = re.compile(r"^(?:option\s+)?([a-e])\.?$", re.IGNORECASE)


def _first(data: Dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return None


def _as_answers(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    text = str(raw).strip()
    return [text] if text else []


def stem_without_blank_or_gloss(question: str) -> str:
    """Visible sentence minus the gap and the UI-language gloss.

    The glossary hint in parentheses is supposed to translate the
    missing word, so it must not count as "the answer already appears
    in the sentence". The gap itself is where the answer belongs.
    """
    stripped = _GLOSS.sub(" ", question or "")
    stripped = BLANK_RE.sub(" ", stripped)
    return stripped


def answer_leaks_into_stem(question: str, answers: Sequence[str]) -> Optional[str]:
    visible = stem_without_blank_or_gloss(question)
    for answer in answers:
        if not answer:
            continue
        if re.search(rf"\b{re.escape(answer)}\b", visible, flags=re.IGNORECASE):
            return answer
    return None


def coerce_mc_answer(
    answer: Any, options: Sequence[Any]
) -> Any:
    """Map a letter/index onto the option it names.

    Exact option text wins, even when that text is "A" — otherwise a
    legitimate vocab item "A" would be rewritten to options[0].
    """
    option_texts = [str(item) for item in options]
    if isinstance(answer, bool) or answer is None:
        return answer
    if isinstance(answer, list):
        return [coerce_mc_answer(item, option_texts) for item in answer]
    if isinstance(answer, int) and 0 <= answer < len(option_texts):
        return option_texts[answer]
    if not isinstance(answer, str):
        return answer
    trimmed = answer.strip()
    for option in option_texts:
        if option.strip() == trimmed or option.strip().lower() == trimmed.lower():
            return option
    match = _LETTER.fullmatch(trimmed)
    if match:
        index = ord(match.group(1).lower()) - ord("a")
        if 0 <= index < len(option_texts):
            return option_texts[index]
    if trimmed.isdigit():
        index = int(trimmed)
        if 0 <= index < len(option_texts):
            return option_texts[index]
        if 1 <= index <= len(option_texts):
            return option_texts[index - 1]
    return answer


def sanitize_multiple_choice(data: Dict[str, Any]) -> Dict[str, Any]:
    options = _first(data, "options") or []
    if not isinstance(options, list):
        return data
    answer_key = "correctAnswer" if "correctAnswer" in data else "correct_answer"
    if answer_key in data:
        data[answer_key] = coerce_mc_answer(data.get(answer_key), options)
    return data


def multiple_choice_quality_issues(
    data: Dict[str, Any], *, require_blank: bool = True
) -> List[str]:
    issues: List[str] = []
    question = str(_first(data, "question") or "").strip()
    options = [
        str(item).strip()
        for item in (_first(data, "options") or [])
        if str(item).strip()
    ]
    answers = _as_answers(_first(data, "correctAnswer", "correct_answer"))
    if not question:
        issues.append("empty question")
    if require_blank and not BLANK_RE.search(question):
        issues.append("no gap in question")
    if len(options) < 2:
        issues.append("fewer than 2 options")
    lowered = [item.lower() for item in options]
    if len(set(lowered)) != len(lowered):
        issues.append("duplicate options")
    if not answers:
        issues.append("missing correctAnswer")
    for answer in answers:
        if answer.lower() not in lowered:
            issues.append(f"answer {answer!r} not in options")
    leaked = answer_leaks_into_stem(question, answers)
    if leaked:
        issues.append(f"answer {leaked!r} already appears in the stem")
    return issues


def fill_in_the_blank_quality_issues(data: Dict[str, Any]) -> List[str]:
    issues: List[str] = []
    question = str(_first(data, "question") or "").strip()
    answers = _as_answers(_first(data, "correctAnswer", "correct_answer"))
    if not question:
        issues.append("empty question")
    if not BLANK_RE.search(question):
        issues.append("no gap in question")
    if not answers:
        issues.append("missing correctAnswer")
    leaked = answer_leaks_into_stem(question, answers)
    if leaked:
        issues.append(f"answer {leaked!r} already appears in the stem")
    return issues
