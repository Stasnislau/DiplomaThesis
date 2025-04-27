from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from pydantic.alias_generators import to_camel

class ExplainAnswerResponse(BaseModel):
  is_correct: bool
  explanation: str
  topics_to_review: Optional[List[str]] = None

  model_config = ConfigDict(
      alias_generator=to_camel,
      populate_by_name=True,
  )
