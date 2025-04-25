from pydantic import BaseModel
from typing import List, Dict

class LevelSkills(BaseModel):
    listening: str
    reading: str
    spoken_interaction: str
    spoken_production: str
    writing: str

class LevelData(BaseModel): 
    level: str
    full_description: str
    listening: str
    reading: str
    spoken_interaction: str
    spoken_production: str
    writing: str
    vector: List[float]

class SpecificSkillContext(BaseModel):
    level: str
    skill_type: str
    description: str

class FullLevelContext(BaseModel):
    level: str
    full_description: str
    skills: LevelSkills

class SimilarLevel(BaseModel):
    level: str
    similarity_score: float
    skills: LevelSkills