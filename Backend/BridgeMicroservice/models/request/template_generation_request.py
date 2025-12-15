from pydantic import BaseModel


class TemplateGenerationRequest(BaseModel):
    template_id: str | None = None
    template_text: str | None = None
    language: str | None = None
    level: str | None = None

