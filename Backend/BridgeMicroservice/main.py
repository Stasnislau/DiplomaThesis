from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from controllers.writing_controller import Writing_Controller
from services.writing_task_service import Writing_Task_Service
from services.ai_service import AI_Service
from services.bielik_service import Bielik_Service
from middlewares.error_handling_middleware import ErrorHandlingMiddleware
from services.vector_db_service import VectorDBService
from controllers.placement_controller import Placement_Controller
from services.placement_service import Placement_Service
from controllers.speaking_controller import Speaking_Controller
from services.speaking_service import Speaking_Service
import logging
import litellm
from typing import Awaitable, Callable
load_dotenv()

app = FastAPI()

error_handler_middleware_instance = ErrorHandlingMiddleware(app)

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
    prefix="/api",
)

app.include_router(
    Placement_Controller(
        Placement_Service(AI_Service(), VectorDBService()),
        Bielik_Service(),
    ).get_router(),
    prefix="/api",
)

app.include_router(
    Speaking_Controller(
        Speaking_Service(AI_Service()),
    ).get_router(),
    prefix="/api",
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

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Reuse the logic from our middleware
    return error_handler_middleware_instance.handle_validation_error(exc)

@app.middleware("http")
async def log_requests(request: Request, call_next: Callable[[Request], Awaitable[JSONResponse]]) -> JSONResponse:
    # Avoid reading request body here to prevent consuming the stream before validation
    print(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)

    print(f"Response ✅: {response.status_code}") # Log status code instead of the whole response object
    return response


@app.middleware("http")
async def catch_all_undefined_endpoints(request: Request, call_next: Callable[[Request], Awaitable[JSONResponse]]) -> JSONResponse:
    print(f"🔍 Checking endpoint: {request.url.path}")
    response = await call_next(request)
    if response.status_code == 404:
        print(f"❌ 404 caught for path: {request.url.path}")
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "payload": {"message": "No such endpoint", },
            },
        )
    return response
