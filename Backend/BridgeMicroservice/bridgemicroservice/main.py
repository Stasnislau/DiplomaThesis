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
import litellm

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

logging.basicConfig(level=logging.ERROR)

logging.getLogger("litellm.llms").setLevel(logging.ERROR)
logging.getLogger("litellm.utils").setLevel(logging.ERROR)
logging.getLogger("openai").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.ERROR)

litellm.set_verbose = False
litellm.suppress_debug_info = True
litellm.success_callback = []
litellm.failure_callback = []

logging.getLogger("fastapi").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    
    try:
        body = await request.json()
        print(f"Body: {body}")
    except Exception as e:
        print(f"Failed to read body: {e}")
    
    response = await call_next(request)

    print(f"Response ✅: {response}")
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
