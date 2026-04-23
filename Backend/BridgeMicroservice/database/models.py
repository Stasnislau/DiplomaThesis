from datetime import datetime, timezone

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class LessonCompletion(Base):
    __tablename__ = "lesson_completions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    lesson_id: Mapped[str] = mapped_column(String(50), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),
    )
