from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from bridgemicroservice.controllers.writing_controller import Writing_Controller
from bridgemicroservice.services.writing_task_service import Writing_Task_Service
from bridgemicroservice.services.ai_service import AI_Service
from bridgemicroservice.services.bielik_service import Bielik_Service
from .middlewares.error_handling_middleware import ErrorHandlingMiddleware
from bridgemicroservice.services.vector_db_service import VectorDBService
from bridgemicroservice.controllers.placement_controller import Placement_Controller
from bridgemicroservice.services.placement_service import Placement_Service
import logging

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
        Writing_Task_Service(VectorDBService(), AI_Service()),
        Bielik_Service(),
    ).get_router(),
    prefix="/api"
)

app.include_router(
    Placement_Controller(
        Placement_Service(AI_Service(), VectorDBService()),
        Bielik_Service(),
    ).get_router(),
    prefix="/api"
)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print("\n=== BRIDGE DEBUG START ===")
    print(f"🚀 Incoming request to Bridge:")
    print(f"URL: {request.url}")
    print(f"Method: {request.method}")
    print(f"Headers: {request.headers}")
    
    try:
        body = await request.json()
        print(f"Body: {body}")
    except Exception as e:
        print(f"Failed to read body: {e}")
    
    response = await call_next(request)
    
    print(f"📤 Response status: {response.status_code}")
    print("=== BRIDGE DEBUG END ===\n")
    return response

@app.middleware("http")
async def catch_all_undefined_endpoints(request: Request, call_next):
    print(f"🔍 Checking endpoint: {request.url.path}")
    response = await call_next(request)
    if response.status_code == 404:
        print(f"❌ 404 caught for path: {request.url.path}")
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "payload": {
                    "message": "No such endpoint",
                    "path": str(request.url)
                }
            }
        )
    return response
