from dotenv import load_dotenv
from litellm import completion

load_dotenv()

model = "gpt-4o-mini"


class AI_Service:
    def __init__(self):
        pass

    async def get_ai_response(self, input_data):
        chat_response = completion(
            model=model,
            messages=[
                {"role": "user", "content": input_data},
            ],
            response_format={"type": "json_object"},
        )
        return chat_response.choices[0].message.content
