from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class WritingTaskRequest(BaseModel):
    language: str
    level: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
