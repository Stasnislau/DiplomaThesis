from fastapi import APIRouter, Request
from ..services.ai_service import AI_Service

class Ai_Controller:
    def __init__(self, ai_service: AI_Service):
        self.ai_service = ai_service
        self.router = APIRouter(prefix="/api")

    def get_router(self) -> APIRouter:
        @self.router.post("/askAi")
        async def ask_ai(request: Request):
            data = await request.json()
            input_data = data.get("input")
            if not input_data:
                return {"error": "No input provided"}
            return {"response": await self.ai_service.get_ai_response(input_data)}

        @self.router.post("/bridge/createtask")
        async def create_task(request: Request):
            data = await request.json()
            return await self.ai_service.generate_task(
                data.get("language"),
                data.get("level")
            )

        @self.router.post("/bridge/explainanswer")
        async def explain_answer(request: Request):
            data = await request.json()
            return await self.ai_service.explain_answer(
                data.get("language"),
                data.get("level"),
                data.get("task"),
                data.get("correct_answer"),
                data.get("user_answer")
            )

        return self.router

    