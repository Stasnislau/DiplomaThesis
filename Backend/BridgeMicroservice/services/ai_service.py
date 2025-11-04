from dotenv import load_dotenv
from litellm import acompletion
from typing import Optional

load_dotenv()


class AI_Service:
    def __init__(self) -> None:
        pass

    async def get_ai_response(self, prompt: str, model: str = "gemini/gemini-flash-latest") -> str:
        chat_response = await acompletion(
            model=model,
            messages=[
                {"role": "system", "content": "You are a philologist with over 20 years of experience in language education."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            timeout=45,  # Set a 45-second timeout
        )
        content: Optional[str] = chat_response.choices[0].message.content
        assert content is not None, "Received None content from AI"
        return content

    # async def get_file_response(self, prompt: str, model: str = "gemini/gemini-flash-latest") -> str:
    #     chat_response = await acompletion(
    #         model=model,
    #         messages=[
    #             {"role": "system", "content": "You are a philologist with over 20 years of experience in language education."},
    #             {"role": "user", "content": prompt},
    #         ],
    #     )
