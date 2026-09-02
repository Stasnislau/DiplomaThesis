from typing import Optional, Dict, Any
from pydantic import BaseModel

class BetterTask(BaseModel):
    question: Optional[str] = None
    options: Optional[list[str]] = None
    correct_answer: Optional[list[str]] = None
    blank_spot: Optional[str] = None
    sentence_before_blank: Optional[str] = None
    sentence_after_blank: Optional[str] = None


class VerificationResult(BaseModel):
    is_valid: bool
    better_task: Optional[BetterTask] = None
    explanation: Optional[str] = None
