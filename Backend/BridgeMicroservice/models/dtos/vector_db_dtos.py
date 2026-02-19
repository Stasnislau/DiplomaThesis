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
    vector: Optional[List[float]] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        extra='allow' 
    )
