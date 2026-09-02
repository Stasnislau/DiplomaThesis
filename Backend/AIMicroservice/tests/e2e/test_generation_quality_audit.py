
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.e2e.conftest import post_live
from utils.task_quality import (
    fill_in_the_blank_quality_issues,
    multiple_choice_quality_issues,
)

pytestmark = [pytest.mark.e2e]


def _print_sample(label: str, payload: dict, issues: list[str]) -> None:
    verdict = "BROKEN" if issues else "ok"
    print(f"\n=== {label} [{verdict}] ===")
    print(json.dumps(payload, ensure_ascii=False, indent=2)[:2500])
    if issues:
        print("ISSUES:", "; ".join(issues))


class TestLiveGenerationQualityAudit:
    def test_writing_and_placement_samples(self, client: TestClient) -> None:
        failures: list[str] = []
        cases = [
            ("MC EN B1", "/api/writing/multiplechoice", {"language": "English", "level": "B1"}, "mc"),
            ("MC PL B1", "/api/writing/multiplechoice", {"language": "Polish", "level": "B1"}, "mc"),
            ("MC RU B1", "/api/writing/multiplechoice", {"language": "Russian", "level": "B1"}, "mc"),
            ("MC DE A2", "/api/writing/multiplechoice", {"language": "German", "level": "A2"}, "mc"),
            ("MC ES A2", "/api/writing/multiplechoice", {"language": "Spanish", "level": "A2"}, "mc"),
            ("FIB EN B1", "/api/writing/blank", {"language": "English", "level": "B1", "topic": "travel"}, "fib"),
            ("FIB PL A2", "/api/writing/blank", {"language": "Polish", "level": "A2", "topic": "food"}, "fib"),
            ("FIB RU B1", "/api/writing/blank", {"language": "Russian", "level": "B1", "topic": "work"}, "fib"),
            ("PLACE EN", "/api/placement/task", {"language": "English"}, "any"),
        ]
        for label, path, body, kind in cases:
            payload = post_live(client, path, body)
            if kind == "mc" or payload.get("type") == "multiple_choice":
                issues = multiple_choice_quality_issues(payload)
            elif kind == "fib" or payload.get("type") == "fill_in_the_blank":
                issues = fill_in_the_blank_quality_issues(payload)
            else:
                issues = (
                    multiple_choice_quality_issues(payload)
                    if payload.get("type") == "multiple_choice"
                    else fill_in_the_blank_quality_issues(payload)
                )
            _print_sample(label, payload, issues)
            if issues:
                failures.append(f"{label}: {'; '.join(issues)}")
        assert not failures, "broken generated tasks:\n" + "\n".join(failures)

    def test_listening_and_speaking_and_essay(self, client: TestClient) -> None:
        failures: list[str] = []
        with patch(
            "services.tts_service.TTSService.synthesize",
            new=MagicMock(return_value=b"fake-mp3"),
        ), patch(
            "services.tts_service.TTSService.synthesize_multispeaker",
            new=MagicMock(return_value=(b"fake-mp3", [])),
        ):
            listening = post_live(
                client,
                "/api/tasks/listening",
                {"language": "English", "level": "A2"},
            )
        listen_issues: list[str] = []
        if not (listening.get("transcript") or "").strip():
            listen_issues.append("empty transcript")
        questions = listening.get("questions") or []
        if len(questions) < 1:
            listen_issues.append("no questions")
        for i, q in enumerate(questions):
            if q.get("type") == "multiple_choice":
                listen_issues.extend(
                    f"q{i}: {x}"
                    for x in multiple_choice_quality_issues(q, require_blank=False)
                )
            elif q.get("type") in {"fill_in_the_blank", "sentence_completion"}:
                listen_issues.extend(
                    f"q{i}: {x}" for x in fill_in_the_blank_quality_issues(q)
                )
            elif not (q.get("question") or "").strip():
                listen_issues.append(f"q{i}: empty question")
        _print_sample("LISTEN EN A2", listening, listen_issues)
        if listen_issues:
            failures.append("LISTEN: " + "; ".join(listen_issues))

        phrase = post_live(
            client, "/api/speaking/practice-phrase", {"language": "English", "level": "B1"}
        )
        phrase_issues = [] if (phrase.get("phrase") or "").strip() else ["empty phrase"]
        _print_sample("SPEAK PHRASE EN B1", phrase, phrase_issues)
        if phrase_issues:
            failures.append("PHRASE: " + "; ".join(phrase_issues))

        prompt = post_live(
            client,
            "/api/speaking/practice-prompt",
            {"language": "Polish", "level": "A2", "format": "timed_response"},
        )
        prompt_issues = [] if (prompt.get("prompt") or "").strip() else ["empty prompt"]
        if prompt.get("format") != "timed_response":
            prompt_issues.append(f"wrong format {prompt.get('format')}")
        _print_sample("SPEAK TIMED PL A2", prompt, prompt_issues)
        if prompt_issues:
            failures.append("SPEAK: " + "; ".join(prompt_issues))

        essay = post_live(
            client,
            "/api/writing/essay/generate",
            {"language": "English", "level": "B2", "topic": "climate change"},
        )
        essay_issues = []
        if not (essay.get("topic") or essay.get("prompt")):
            essay_issues.append("no topic")
        _print_sample("ESSAY EN B2", essay, essay_issues)
        if essay_issues:
            failures.append("ESSAY: " + "; ".join(essay_issues))

        assert not failures, "broken generated tasks:\n" + "\n".join(failures)

    def test_typed_quiz_catalog_samples(self, client: TestClient) -> None:
        failures: list[str] = []
        for task_type in ("true_false", "matching", "fill_in_the_blank", "multiple_choice"):
            payload = post_live(
                client,
                "/api/writing/typed-task",
                {"language": "English", "level": "B1", "taskType": task_type},
            )
            issues: list[str] = []
            if not (payload.get("question") or payload.get("passage_with_blanks") or "").strip():
                if task_type != "matching" or not payload.get("pairs"):
                    issues.append("no question stem")
            if payload.get("type") == "multiple_choice":
                issues.extend(multiple_choice_quality_issues(payload))
            elif payload.get("type") == "fill_in_the_blank":
                issues.extend(fill_in_the_blank_quality_issues(payload))
            elif payload.get("type") == "true_false":
                answer = str(payload.get("correctAnswer") or payload.get("correct_answer") or "").lower()
                if answer not in {"true", "false"}:
                    issues.append(f"true_false answer not boolean-like: {answer!r}")
            elif payload.get("type") == "matching":
                pairs = payload.get("pairs") or []
                if len(pairs) < 2:
                    issues.append(f"too few pairs: {pairs}")
            _print_sample(f"TYPED {task_type}", payload, issues)
            if issues:
                failures.append(f"{task_type}: {'; '.join(issues)}")
        assert not failures, "broken typed tasks:\n" + "\n".join(failures)
