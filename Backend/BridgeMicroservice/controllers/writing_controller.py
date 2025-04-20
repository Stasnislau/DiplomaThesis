from fastapi import APIRouter, HTTPException, Request
from services.writing_task_service import Writing_Task_Service
from services.bielik_service import Bielik_Service


class Writing_Controller:
    def __init__(
        self, writing_task_service: Writing_Task_Service, bielik_service: Bielik_Service
    ):
        self.writing_task_service = writing_task_service
        self.bielik_service = bielik_service
        self.router = APIRouter()

    def get_router(self) -> APIRouter:
        @self.router.post("/writing/multiplechoice")
        async def generate_writing_multiple_choice_task(request: Request):
            try:
                data = await request.json()
                language = data.get("language")
                level = data.get("level")
                print(language, level)
                if not language or not level:
                    raise HTTPException(
                        status_code=400, detail="Language and level are required"
                    )
                return {
                    "success": True,
                    "payload": await self.writing_task_service.generate_writing_multiple_choice_task(
                        language, level
                    ),
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.post("/writing/blank")
        async def create_blank_task(request: Request):
            try:
                data = await request.json()
                language = data.get("language")
                level = data.get("level")
                if not language or not level:
                    raise HTTPException(
                        status_code=400, detail="Language and level are required"
                    )
                result = await self.writing_task_service.generate_writing_fill_in_the_blank_task(
                    language, level
                )
                return {"success": True, "payload": result}
            except Exception as e:
                print(e, "here error writing controller")
                raise HTTPException(status_code=500, detail=str(e))

        @self.router.post("/writing/explainanswer")
        async def explain_answer(request: Request):
            try:
                data = await request.json()
                required_fields = [
                    "language",
                    "level",
                    "task",
                    "correct_answer",
                    "user_answer",
                ]
                for field in required_fields:
                    if not data.get(field):
                        raise HTTPException(
                            status_code=400, detail=f"Missing required field: {field}"
                        )

                result = await self.writing_task_service.explain_answer(
                    data["language"],
                    data["level"],
                    data["task"],
                    data["correct_answer"],
                    data["user_answer"],
                )
                return {"success": True, "payload": result}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        return self.router

