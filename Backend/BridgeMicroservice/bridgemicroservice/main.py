from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from bridgemicroservice.controllers.ai_controller import Ai_Controller
from bridgemicroservice.services.ai_service import AI_Service
from bridgemicroservice.services.bielik_service import Bielik_Service
from .middlewares.error_handling_middleware import ErrorHandlingMiddleware

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

app.include_router(Ai_Controller(AI_Service(Bielik_Service())).get_router())
