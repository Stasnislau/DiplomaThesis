from dotenv import load_dotenv
from litellm import completion
import logging

load_dotenv()

model = "gpt-4o-mini"


class AI_Service:
    def __init__(self):
        pass

    async def get_ai_response(self, input_data):
        chat_response = completion(
            model=model,
            messages=[
                {"role": "user", 
                 "system": "You are a philologist with over 20 years of experience in language education.",
                 "content": input_data
                },
            ],
            response_format={"type": "json_object"},
        )
        return chat_response.choices[0].message.content

    async def get_mistral_response(self, input_data):
        chat_response = completion(
            model="mistral/open-mixtral-8x22b",
            messages=[
                {"role": "user", "content": input_data},
            ],
            response_format={"type": "json_object"},
        )
        return chat_response.choices[0].message.content
