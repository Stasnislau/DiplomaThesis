
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from services.user_service import UserService
from services.writing_task_service import WritingTaskService
from utils.user_context import UserContext


LEARNER = UserContext(
    user_id="22222222-2222-2222-2222-222222222222",
    user_email="a@b.c",
    user_role="USER",
    authorization="Bearer t",
)


def _error(text, correction, error_type="grammar"):
    return {"errorText": text, "correction": correction, "errorType": error_type}


class TestReadingTheLog:
    @pytest.fixture(autouse=True)
    def _internal_key(self, monkeypatch):
        monkeypatch.setenv("INTERNAL_SERVICE_KEY", "test-internal-key")

    @pytest.fixture
    def service(self):
        svc = UserService.__new__(UserService)
        svc.base_url = "http://user.test/api"
        svc._get = AsyncMock()
        return svc

    @pytest.mark.asyncio
    async def test_returns_the_rows_the_user_service_sends(self, service):
        rows = [_error("idzie do sklep", "idzie do sklepu")]
        service._get.return_value = {"success": True, "payload": rows}

        assert await service.get_recurring_errors(LEARNER, "pl") == rows

    @pytest.mark.asyncio
    async def test_asks_for_the_language_the_caller_named(self, service):
        service._get.return_value = {"success": True, "payload": []}

        await service.get_recurring_errors(LEARNER, "es")

        path = service._get.call_args[0][0]
        assert "languageCode=es" in path

    @pytest.mark.asyncio
    async def test_an_unreachable_log_does_not_stop_generation(self, service):
        service._get.side_effect = HTTPException(status_code=503, detail="down")

        assert await service.get_recurring_errors(LEARNER, "pl") == []

    @pytest.mark.asyncio
    async def test_a_malformed_answer_is_treated_as_no_errors(self, service):
        service._get.return_value = {"success": True, "payload": "not a list"}

        assert await service.get_recurring_errors(LEARNER, "pl") == []


class TestTheLogSteersTheNextTask:
    def test_a_correction_becomes_a_weakness(self):
        focus = WritingTaskService.derive_adaptive_focus(
            [], [_error("idzie do sklep", "idzie do sklepu")]
        )

        assert "idzie do sklepu" in focus["weaknesses"]

    def test_the_wrong_text_becomes_a_keyword(self):
        focus = WritingTaskService.derive_adaptive_focus(
            [], [_error("idzie do sklep", "idzie do sklepu")]
        )

        assert "idzie do sklep" in focus["keywords"]

    def test_the_worst_errors_come_first(self):
        rows = [_error(f"wrong {i}", f"right {i}") for i in range(6)]

        focus = WritingTaskService.derive_adaptive_focus([], rows)

        assert focus["weaknesses"][0] == "right 0"
        assert "right 5" not in focus["weaknesses"]

    def test_the_log_outranks_the_task_history(self):
        history = [{"taskType": "placement", "metadata": {"weaknesses": ["past tense"]}}]

        focus = WritingTaskService.derive_adaptive_focus(
            history, [_error("idzie do sklep", "idzie do sklepu")]
        )

        assert focus["weaknesses"][0] == "idzie do sklepu"
        assert "past tense" in focus["weaknesses"]

    def test_history_alone_still_works(self):
        history = [{"taskType": "placement", "metadata": {"weaknesses": ["past tense"]}}]

        focus = WritingTaskService.derive_adaptive_focus(history)

        assert focus["weaknesses"] == ["past tense"]

    def test_rows_without_a_correction_are_skipped(self):
        rows = [{"errorText": "", "correction": None, "errorType": None}, "junk"]

        focus = WritingTaskService.derive_adaptive_focus([], rows)

        assert focus["weaknesses"] == []
