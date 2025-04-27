from pydantic import BaseModel, ConfigDict, Field
from typing import TypeVar, Generic, List, Dict, Any, Optional  
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class BaseResponse(BaseModel, Generic[T]):
    success: bool = Field(default=True)
    payload: T | None = Field(default=None)
    errors: List[str] | None = Field(default=None)

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )
