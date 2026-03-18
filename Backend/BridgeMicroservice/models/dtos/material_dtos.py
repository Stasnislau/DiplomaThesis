from typing import List, Union, Any, Dict, Optional
from pydantic import BaseModel, Field, ConfigDict

class ChunkMetadata(BaseModel):
    source: str
    chunk_index: int

class QuestionTypeExample(BaseModel):
    type: str
    example: str

class ProcessPdfResponse(BaseModel):
    filename: str
    chunks_count: int
    status: str
    analyzed_types: Union[List[QuestionTypeExample], List[Dict[str, Any]]]

class QuizQuestion(BaseModel):
    question: str
    options: List[str] = Field(default_factory=list)
    correct_answer: str = Field(alias="correct_answer")
    type: str
    context_text: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
    )

class QuizContent(BaseModel):
    questions: List[QuizQuestion]

    model_config = ConfigDict(
        populate_by_name=True,
    )

class GenerateQuizResponse(BaseModel):
    quiz: Union[QuizContent, str]
