from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ListeningTaskRequest(BaseModel):
    language: str
    level: str
    # Subset of canonical question types the user wants in the
    # generated set. None / empty list = service default mix
    # (multiple_choice + fill_in_the_blank, the original behaviour).
    # Recognised values: "multiple_choice", "fill_in_the_blank",
    # "dictation", "true_false_not_given", "sentence_completion",
    # "multi_speaker_matching".
    question_types: Optional[List[str]] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
