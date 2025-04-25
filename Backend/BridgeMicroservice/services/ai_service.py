from dotenv import load_dotenv
from litellm import completion
from models.ai_responses import LiteLLMCompletionResponse
from typing import Optional

load_dotenv()

model = "mistral/mistral-small-latest"


class AI_Service: 
    def __init__(self) -> None:
        pass

    async def get_ai_response(self, prompt  : str) -> str:
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

    async def get_mistral_response(self, prompt: str) -> str:
        chat_response: LiteLLMCompletionResponse = completion(
            model="mistral/open-mixtral-8x22b",
            messages=[
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        content: Optional[str] = chat_response.choices[0].message.content
        assert content is not None, "Received None content from AI"
        return content
