import pytest
from services.learning_path_service import LearningPathService


@pytest.fixture
def service() -> LearningPathService:
    """Fresh service instance with clean in-memory state."""
    svc = LearningPathService()
    svc._completed = {}  # reset class-level state between tests
    return svc


# ── complete_lesson ─────────────────────────────────────────────────────────


class TestCompleteLesson:
    def test_marks_lesson_completed(self, service: LearningPathService) -> None:
        result = service.complete_lesson("l1", user_id="user1")
        assert result["completed_lesson_id"] == "l1"
        assert "l1" in service._user_completed("user1")

    def test_unlocks_next_lesson_in_module(self, service: LearningPathService) -> None:
        result = service.complete_lesson("l1", user_id="user1")
        # l1 is the first lesson → l2 should be unlocked
        assert result["next_lesson_unlocked"] == "l2"

    def test_module_not_completed_after_first_lesson(self, service: LearningPathService) -> None:
        result = service.complete_lesson("l1", user_id="user1")
        assert result["module_completed"] is False

    def test_module_completed_after_all_lessons(self, service: LearningPathService) -> None:
        # Complete all lessons in the first module (first unit of A1)
        # We need to find how many lessons are in module 1.
        path = service.get_learning_path("english", "A1", user_id="user1")
        first_module = path.modules[0]
        lesson_ids = [lesson.id for lesson in first_module.lessons]

        for lid in lesson_ids:
            result = service.complete_lesson(lid, user_id="user1")

        # After completing all lessons, module should be complete
        assert result["module_completed"] is True
        assert result["next_lesson_unlocked"] is None  # no more lessons

    def test_per_user_isolation(self, service: LearningPathService) -> None:
        service.complete_lesson("l1", user_id="alice")
        assert "l1" in service._user_completed("alice")
        assert "l1" not in service._user_completed("bob")

    def test_idempotent(self, service: LearningPathService) -> None:
        service.complete_lesson("l1", user_id="user1")
        service.complete_lesson("l1", user_id="user1")
        assert len([x for x in service._user_completed("user1") if x == "l1"]) == 1


# ── bulk_complete_levels ────────────────────────────────────────────────────


class TestBulkCompleteLevels:
    def test_a1_skips_everything(self, service: LearningPathService) -> None:
        result = service.bulk_complete_levels("A1", user_id="user1")
        assert result["completed_lesson_ids"] == []
        assert result["levels_completed"] == []

    def test_b1_completes_a1_and_a2(self, service: LearningPathService) -> None:
        result = service.bulk_complete_levels("B1", user_id="user1")
        assert "A1" in result["levels_completed"]
        assert "A2" in result["levels_completed"]
        assert "B1" not in result["levels_completed"]
        assert result["total"] > 0

    def test_completed_lessons_visible_in_learning_path(
        self, service: LearningPathService
    ) -> None:
        service.bulk_complete_levels("B1", user_id="user1")
        path = service.get_learning_path("english", "B1", user_id="user1")

        # All A1 + A2 modules should have 100% progress
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

    def test_c2_completes_all_lower_levels(self, service: LearningPathService) -> None:
        result = service.bulk_complete_levels("C2", user_id="user1")
        assert set(result["levels_completed"]) == {"A1", "A2", "B1", "B2", "C1"}
        assert result["total"] > 0

    def test_invalid_level_returns_empty(self, service: LearningPathService) -> None:
        result = service.bulk_complete_levels("INVALID", user_id="user1")
        assert result["completed_lesson_ids"] == []

    def test_per_user_isolation(self, service: LearningPathService) -> None:
        service.bulk_complete_levels("B1", user_id="alice")
        alice_completed = service._user_completed("alice")
        bob_completed = service._user_completed("bob")
        assert len(alice_completed) > 0
        assert len(bob_completed) == 0


# ── get_learning_path ───────────────────────────────────────────────────────


class TestGetLearningPath:
    def test_returns_modules(self, service: LearningPathService) -> None:
        path = service.get_learning_path("english", "A1")
        assert len(path.modules) > 0
        assert path.language == "english"
        assert path.user_level == "A1"

    def test_first_lesson_of_current_level_is_unlocked(
        self, service: LearningPathService
    ) -> None:
        path = service.get_learning_path("english", "A1", user_id="new_user")
        first_module = path.modules[0]
        assert first_module.level == "A1"
        assert first_module.lessons[0].status == "UNLOCKED"

    def test_completed_lesson_shows_as_completed(
        self, service: LearningPathService
    ) -> None:
        service.complete_lesson("l1", user_id="user1")
        path = service.get_learning_path("english", "A1", user_id="user1")
        first_lesson = path.modules[0].lessons[0]
        assert first_lesson.id == "l1"
        assert first_lesson.status == "COMPLETED"

    def test_completing_lesson_unlocks_next(
        self, service: LearningPathService
    ) -> None:
        service.complete_lesson("l1", user_id="user1")
        path = service.get_learning_path("english", "A1", user_id="user1")
        second_lesson = path.modules[0].lessons[1]
        assert second_lesson.status == "UNLOCKED"

    def test_progress_percentage(self, service: LearningPathService) -> None:
        path = service.get_learning_path("english", "A1", user_id="user1")
        first_module = path.modules[0]
        total = len(first_module.lessons)

        # Complete first lesson
        service.complete_lesson(first_module.lessons[0].id, user_id="user1")
        path = service.get_learning_path("english", "A1", user_id="user1")
        expected = int((1 / total) * 100)
        assert path.modules[0].progress == expected
