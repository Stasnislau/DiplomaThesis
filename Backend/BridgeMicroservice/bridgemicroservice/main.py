from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from bridgemicroservice.controllers.writing_controller import Writing_Controller
from bridgemicroservice.services.writing_task_service import Writing_Task_Service
from bridgemicroservice.services.ai_service import AI_Service
from bridgemicroservice.services.bielik_service import Bielik_Service
from .middlewares.error_handling_middleware import ErrorHandlingMiddleware
from bridgemicroservice.services.vector_db_service import VectorDBService

load_dotenv()

app = FastAPI()
app.add_middleware(ErrorHandlingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    Writing_Controller(
        Writing_Task_Service(VectorDBService(), AI_Service())
    ).get_router()
)
