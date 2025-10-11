from pydantic import BaseModel


class ListeningTaskRequest(BaseModel):
    language: str
    level: str
