import json
import uuid
from typing import Union, Any, Dict, Type, TypeVar
from services.vector_db_service import VectorDBService
from services.ai_service import AI_Service
from dotenv import load_dotenv
from constants.prompts import writing_multiple_choice_task_prompt, writing_fill_in_the_blank_task_prompt, explain_answer_prompt
from models.dtos.task_dto import MultipleChoiceTask, FillInTheBlankTask
from models.dtos.vector_db_dtos import SpecificSkillContext, FullLevelContext
from models.request.explain_answer_request import ExplainAnswerRequest
from fastapi import HTTPException
from models.responses.explain_answer_response import ExplainAnswerResponse
from pipelines.verification_pipeline import VerificationPipeline
from models.dtos.verification_dtos import VerificationResult
from pydantic import BaseModel

load_dotenv()

TaskModelType = TypeVar("TaskModelType", bound=BaseModel)


class Writing_Task_Service:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service):
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service
        self.verification_pipeline = VerificationPipeline(ai_service)

    async def generate_writing_multiple_choice_task(self, language: str, level: str) -> MultipleChoiceTask:
        level_context: Union[SpecificSkillContext, FullLevelContext, None] = self.vector_db_service.get_level_context(
            level.upper(), "writing"
        )
        if not level_context:
            raise ValueError(f"Invalid level: {level}")

        prompt = writing_multiple_choice_task_prompt(language, level, level_context.model_dump())
        response = await self.ai_service.get_ai_response(prompt)
        json_response = await self._process_ai_response_and_validate(response)
        print(json_response, "INITIAL TASK")

        verification_result: VerificationResult = VerificationResult(is_valid=True)  # Default to valid
        try:
            # verification_result = await self.verification_pipeline.verify_task(json_response, language)

            verification_result = VerificationResult(is_valid=True)

            if not verification_result.is_valid and verification_result.better_task:
                json_response = verification_result.better_task.model_dump(exclude_unset=True)
                print("Using improved task from verification.", json_response)
            elif not verification_result.is_valid:
                print(f"Task not valid and no better_task provided: {verification_result.explanation}")

            return self._finalize_task_generation(json_response, "multiple_choice", MultipleChoiceTask)

        except Exception as e:
            print(f"Error during task generation/verification: {e}")
            return self._finalize_task_generation(json_response, "multiple_choice", MultipleChoiceTask)

    async def generate_writing_fill_in_the_blank_task(self, language: str, level: str) -> FillInTheBlankTask:
        level_context: Union[SpecificSkillContext, FullLevelContext, None] = self.vector_db_service.get_level_context(
            level.upper(), "writing"
        )

        if not level_context:
            raise ValueError(f"Invalid level: {level}")

        prompt = writing_fill_in_the_blank_task_prompt(language, level, level_context.model_dump())
        response = await self.ai_service.get_ai_response(prompt)
        json_response = await self._process_ai_response_and_validate(response, is_fill_in_blank=True)

        return self._finalize_task_generation(json_response, "fill_in_the_blank", FillInTheBlankTask)

    async def explain_answer(self, explain_answer_request: ExplainAnswerRequest) -> ExplainAnswerResponse:
        language = explain_answer_request.language
        level = explain_answer_request.level
        task = explain_answer_request.task
        correct_answer = explain_answer_request.correct_answer
        user_answer = explain_answer_request.user_answer
        prompt = explain_answer_prompt(language, level, task, correct_answer, user_answer)
        response = await self.ai_service.get_ai_response(prompt)
        json_response = await self._process_ai_response_and_validate(response)

        return self._finalize_task_generation(
            json_response,
            "explain_answer_response",
            ExplainAnswerResponse,
        )

    async def _process_ai_response_and_validate(self, response_str: str, is_fill_in_blank: bool = False) -> Dict[str, Any]:
        try:
            json_data = json.loads(response_str)
            if is_fill_in_blank and isinstance(json_data.get("correctAnswer"), list):
                if len(json_data["correctAnswer"]) > 0:
                    json_data["correctAnswer"] = json_data["correctAnswer"][0]
                else:
                    json_data["correctAnswer"] = ""
            return json_data  # type: ignore # Explicitly ignore until mypy correctly infers dict type from json.loads
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response JSON: {e}\nRaw response: {response_str}")
            raise HTTPException(status_code=500, detail="Failed to parse AI response into expected JSON structure.")
        except Exception as e:
            print(f"Error processing AI response: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process AI response: {str(e)}")

    def _finalize_task_generation(self, json_response: Dict[str, Any], task_type: str, model_class: Type[TaskModelType]) -> TaskModelType:
        json_response["id"] = str(uuid.uuid4())
        json_response["type"] = task_type
        try:
            return model_class(**json_response)
        except Exception as e:
            print(f"Pydantic validation failed for {model_class.__name__}. Data: {json_response}")
            print(f"Validation Error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create valid {model_class.__name__}: {e}")
