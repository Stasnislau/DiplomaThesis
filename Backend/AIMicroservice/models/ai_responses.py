from pydantic import BaseModel
from typing import List, Optional


class ResponseMessage(BaseModel):
    role: Optional[str] = None
    content: Optional[str] = None


class ResponseChoice(BaseModel):
    index: Optional[int] = None
    message: ResponseMessage
    finish_reason: Optional[str] = None


class Usage(BaseModel):
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


class LiteLLMCompletionResponse(BaseModel):
    id: Optional[str] = None
    object: Optional[str] = None
    created: Optional[int] = None
    model: Optional[str] = None
    choices: List[ResponseChoice]
    usage: Optional[Usage] = None
