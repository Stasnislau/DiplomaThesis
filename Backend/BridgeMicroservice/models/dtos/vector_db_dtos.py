from pydantic import BaseModel, ConfigDict
from typing import List
from pydantic.alias_generators import to_camel

class LevelSkills(BaseModel):
    listening: str
    reading: str
    spoken_interaction: str
    spoken_production: str
    writing: str

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
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
        alias_generator=to_camel,
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
        alias_generator=to_camel,
    )

class SimilarLevel(BaseModel):
    level: str
    similarity_score: float
    skills: LevelSkills

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )
