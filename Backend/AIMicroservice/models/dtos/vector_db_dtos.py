from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any

class LevelSkills(BaseModel):
    listening: str
    reading: str
    spoken_interaction: str
    spoken_production: str
    writing: str

    model_config = ConfigDict(
        populate_by_name=True,
    )

class LevelData(BaseModel):
    level: str
    full_description: str
    listening: str
    reading: str
    spoken_interaction: str
    spoken_production: str
    writing: str
    vector: List[float]

    model_config = ConfigDict(
        populate_by_name=True,
    )

class SpecificSkillContext(BaseModel):
    level: str
    skill_type: str
    description: str

class FullLevelContext(BaseModel):
    level: str
    full_description: str
    skills: LevelSkills

    model_config = ConfigDict(
        populate_by_name=True,
    )

class SimilarLevel(BaseModel):
    level: str
    similarity_score: float
    skills: LevelSkills

    model_config = ConfigDict(
        populate_by_name=True,
    )

class MaterialChunk(BaseModel):
    text: str
    source: str
    chunk_index: int
    vector: Optional[List[float]] = None
    distance: Optional[float] = Field(default=None, alias="_distance")

    model_config = ConfigDict(
        populate_by_name=True,
        extra='ignore' 
    )

class TaskTemplate(BaseModel):
    id: Optional[str] = None
    template: str
    # These are declared rather than left to `extra='allow'` because
    # save_task_templates turns the model into a LanceDB row: a template
    # that happened to omit one would write a NaN column and shift the
    # table schema out from under the next writer.
    #
    # user_id carries the same meaning as on a materials chunk — the owner
    # of the upload this template was mined from. Templates describe the
    # shape of someone's private PDF, so they are scoped exactly as
    # tightly as the PDF itself. Empty string (never None) for the same
    # reason as in save_chunks: LanceDB needs a stable column type.
    user_id: str = ""
    task_type: str = ""
    level: str = ""
    skill: str = ""
    source: str = ""
    vector: Optional[List[float]] = None
    distance: Optional[float] = Field(default=None, alias="_distance")

    model_config = ConfigDict(
        populate_by_name=True,
        extra='allow'
    )
