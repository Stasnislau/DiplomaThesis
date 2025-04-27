from dotenv import load_dotenv
from litellm import completion
from models.ai_responses import LiteLLMCompletionResponse
from typing import Optional

load_dotenv()


class AI_Service:
    def __init__(self) -> None:
        pass

    async def get_ai_response(self, prompt: str, model: str = "mistral/mistral-small-latest") -> str:
        chat_response: LiteLLMCompletionResponse = completion(
            model=model,
            messages=[
                {"role": "system", "content": "You are a philologist with over 20 years of experience in language education."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        content: Optional[str] = chat_response.choices[0].message.content
        assert content is not None, "Received None content from AI"
        return content
