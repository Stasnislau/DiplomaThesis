import pytest
from unittest.mock import AsyncMock, patch
from services.learning_path_service import LearningPathService


@pytest.fixture
def service() -> LearningPathService:
    """Service with session_factory=None; DB calls are mocked per-test."""
    return LearningPathService(session_factory=None)


# ── Helpers ──────────────────────────────────────────────────────────────────
# We keep a simple in-memory set to simulate DB state in tests.

class _FakeDB:
    """Tiny in-memory stand-in for the lesson_completions table."""

    def __init__(self) -> None:
        self._store: dict[str, set[str]] = {}

    def completed(self, user_id: str) -> set[str]:
        return self._store.get(user_id, set())

    async def get_user_completed(self, user_id: str) -> set[str]:
        return set(self.completed(user_id))

    async def mark_completed(self, user_id: str, lesson_ids: list[str]) -> None:
        self._store.setdefault(user_id, set()).update(lesson_ids)


@pytest.fixture
def fake_db() -> _FakeDB:
    return _FakeDB()


@pytest.fixture
def patched_service(service: LearningPathService, fake_db: _FakeDB) -> LearningPathService:
    """Service with DB calls redirected to in-memory fake."""
    service._get_user_completed = fake_db.get_user_completed  # type: ignore[assignment]
    service._mark_completed = fake_db.mark_completed  # type: ignore[assignment]
    return service


# ── Tests ────────────────────────────────────────────────────────────────────

class TestCompleteLesson:
    @pytest.mark.asyncio
    async def test_marks_lesson_completed(self, patched_service: LearningPathService, fake_db: _FakeDB) -> None:
        result = await patched_service.complete_lesson("l1", user_id="user1")
        assert result["completed_lesson_id"] == "l1"
        assert "l1" in fake_db.completed("user1")

    @pytest.mark.asyncio
    async def test_unlocks_next_lesson_in_module(self, patched_service: LearningPathService) -> None:
        result = await patched_service.complete_lesson("l1", user_id="user1")
        assert result["next_lesson_unlocked"] == "l2"

    @pytest.mark.asyncio
    async def test_module_not_completed_after_first_lesson(self, patched_service: LearningPathService) -> None:
        result = await patched_service.complete_lesson("l1", user_id="user1")
        assert result["module_completed"] is False

    @pytest.mark.asyncio
    async def test_module_completed_after_all_lessons(self, patched_service: LearningPathService) -> None:
        path = await patched_service.get_learning_path("english", "A1", user_id="user1")
        first_module = path.modules[0]
        lesson_ids = [lesson.id for lesson in first_module.lessons]

        for lid in lesson_ids:
            result = await patched_service.complete_lesson(lid, user_id="user1")

        assert result["module_completed"] is True
        assert result["next_lesson_unlocked"] is None

    @pytest.mark.asyncio
    async def test_per_user_isolation(self, patched_service: LearningPathService, fake_db: _FakeDB) -> None:
        await patched_service.complete_lesson("l1", user_id="alice")
        assert "l1" in fake_db.completed("alice")
        assert "l1" not in fake_db.completed("bob")

    @pytest.mark.asyncio
    async def test_idempotent(self, patched_service: LearningPathService, fake_db: _FakeDB) -> None:
        await patched_service.complete_lesson("l1", user_id="user1")
        await patched_service.complete_lesson("l1", user_id="user1")
        assert len([x for x in fake_db.completed("user1") if x == "l1"]) == 1


class TestBulkCompleteLevels:
    @pytest.mark.asyncio
    async def test_a1_skips_everything(self, patched_service: LearningPathService) -> None:
        result = await patched_service.bulk_complete_levels("A1", user_id="user1")
        assert result["completed_lesson_ids"] == []
        assert result["levels_completed"] == []

    @pytest.mark.asyncio
    async def test_b1_completes_a1_and_a2(self, patched_service: LearningPathService) -> None:
        result = await patched_service.bulk_complete_levels("B1", user_id="user1")
        assert "A1" in result["levels_completed"]
        assert "A2" in result["levels_completed"]
        assert "B1" not in result["levels_completed"]
        assert result["total"] > 0

    @pytest.mark.asyncio
    async def test_completed_lessons_visible_in_learning_path(
        self, patched_service: LearningPathService
    ) -> None:
        await patched_service.bulk_complete_levels("B1", user_id="user1")
        path = await patched_service.get_learning_path("english", "B1", user_id="user1")

        for module in path.modules:
            if module.level in ("A1", "A2"):
                assert module.progress == 100, (
                    f"Module {module.id} ({module.level}) should be 100% "
                    f"but is {module.progress}%"
                )
                for lesson in module.lessons:
                    assert lesson.status == "COMPLETED", (
                        f"Lesson {lesson.id} in {module.level} should be COMPLETED"
                    )

    @pytest.mark.asyncio
    async def test_c2_completes_all_lower_levels(self, patched_service: LearningPathService) -> None:
        result = await patched_service.bulk_complete_levels("C2", user_id="user1")
        assert set(result["levels_completed"]) == {"A1", "A2", "B1", "B2", "C1"}
        assert result["total"] > 0

    @pytest.mark.asyncio
    async def test_invalid_level_returns_empty(self, patched_service: LearningPathService) -> None:
        result = await patched_service.bulk_complete_levels("INVALID", user_id="user1")
        assert result["completed_lesson_ids"] == []

    @pytest.mark.asyncio
    async def test_per_user_isolation(self, patched_service: LearningPathService, fake_db: _FakeDB) -> None:
        await patched_service.bulk_complete_levels("B1", user_id="alice")
        assert len(fake_db.completed("alice")) > 0
        assert len(fake_db.completed("bob")) == 0


class TestGetLearningPath:
    @pytest.mark.asyncio
    async def test_returns_modules(self, patched_service: LearningPathService) -> None:
        path = await patched_service.get_learning_path("english", "A1")
        assert len(path.modules) > 0
        assert path.language == "english"
        assert path.user_level == "A1"

    @pytest.mark.asyncio
    async def test_first_lesson_of_current_level_is_unlocked(
        self, patched_service: LearningPathService
    ) -> None:
        path = await patched_service.get_learning_path("english", "A1", user_id="new_user")
        first_module = path.modules[0]
        assert first_module.level == "A1"
        assert first_module.lessons[0].status == "UNLOCKED"

    @pytest.mark.asyncio
    async def test_completed_lesson_shows_as_completed(
        self, patched_service: LearningPathService
    ) -> None:
        await patched_service.complete_lesson("l1", user_id="user1")
        path = await patched_service.get_learning_path("english", "A1", user_id="user1")
        first_lesson = path.modules[0].lessons[0]
        assert first_lesson.id == "l1"
        assert first_lesson.status == "COMPLETED"

    @pytest.mark.asyncio
    async def test_completing_lesson_unlocks_next(
        self, patched_service: LearningPathService
    ) -> None:
        await patched_service.complete_lesson("l1", user_id="user1")
        path = await patched_service.get_learning_path("english", "A1", user_id="user1")
        second_lesson = path.modules[0].lessons[1]
        assert second_lesson.status == "UNLOCKED"

    @pytest.mark.asyncio
    async def test_progress_percentage(self, patched_service: LearningPathService) -> None:
        path = await patched_service.get_learning_path("english", "A1", user_id="user1")
        first_module = path.modules[0]
        total = len(first_module.lessons)

        await patched_service.complete_lesson(first_module.lessons[0].id, user_id="user1")
        path = await patched_service.get_learning_path("english", "A1", user_id="user1")
        expected = int((1 / total) * 100)
        assert path.modules[0].progress == expected
