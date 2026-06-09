from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class ExplainAnswerRequest(BaseModel):
  language: str
  level: str
  task: str
  correct_answer: str
  user_answer: str

  model_config = ConfigDict(
      alias_generator=to_camel,
      populate_by_name=True,
  )

