from pydantic import BaseModel
from typing import TypeVar, Generic, List, Dict, Any

T = TypeVar("T")

class BaseResponse(BaseModel, Generic[T]):
    success: bool
    payload: T | None = None
    errors: List[Dict[str, Any]] | None = None
