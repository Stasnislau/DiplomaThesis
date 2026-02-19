from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from controllers.writing_controller import WritingController
from services.writing_task_service import WritingTaskService
from services.ai_service import AI_Service
from services.learning_path_service import LearningPathService
from controllers.learning_path_controller import LearningPathController

# from services.bielik_service import Bielik_Service
from middlewares.error_handling_middleware import ErrorHandlingMiddleware
from services.vector_db_service import VectorDBService
from controllers.placement_controller import PlacementController
from services.placement_service import PlacementService
from controllers.speaking_controller import SpeakingController
from services.speaking_service import SpeakingService
from controllers.listening_controller import ListeningController
from services.listening_task_service import ListeningTaskService
from controllers.material_controller import router as material_router
import logging
import litellm
from typing import Awaitable, Callable
import uvicorn

load_dotenv()

# Configure application logger
logger = logging.getLogger("bridge_microservice")
logger.setLevel(logging.INFO)

# Create console handler with formatting
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# FastAPI app with Swagger/OpenAPI configuration
app = FastAPI(
    title="Language Learning Bridge API",
    description="""
## Bridge Microservice for AI-Powered Language Learning Platform

This service provides AI-powered endpoints for:
- **Writing Tasks**: Generate multiple choice and fill-in-the-blank tasks
- **Placement Tests**: Assess user language level with adaptive testing
- **Speaking Analysis**: Analyze pronunciation and fluency
- **Listening Tasks**: Generate listening comprehension exercises
- **Materials**: Analyze and manage learning materials

### Authentication
All endpoints require JWT authentication via the `X-User-Id`, `X-User-Email` headers passed from the Gateway.

### Response Format
All responses follow the `BaseResponse` schema:
```json
{
    "success": true,
    "payload": { ... },
    "errors": null
}
```
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Stanislau Ryzhkou",
        "email": "stanislau.ryzhkou@example.com",
    },
    license_info={
        "name": "MIT License",
    },
)

app.mount("/static", StaticFiles(directory="static"), name="static")

error_handler_middleware_instance = ErrorHandlingMiddleware(app)

app.add_middleware(ErrorHandlingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate common services
ai_service = AI_Service()
vector_db_service = VectorDBService()

app.include_router(
    WritingController(
        WritingTaskService(vector_db_service, ai_service),
        # Bielik_Service(),
    ).get_router(),
    prefix="/api",
)

# PLACEMENT #
placement_service = PlacementService(ai_service, vector_db_service)
placement_controller = PlacementController(placement_service)
app.include_router(placement_controller.get_router(), prefix="/api")

# SPEAKING #
speaking_service = SpeakingService(ai_service)
speaking_controller = SpeakingController(speaking_service)
app.include_router(speaking_controller.get_router(), prefix="/api")

# LISTENING #
listening_task_service = ListeningTaskService(ai_service)
listening_controller = ListeningController(listening_task_service)
app.include_router(listening_controller.get_router(), prefix="/api")

# LEARNING PATH #
learning_path_service = LearningPathService()
learning_path_controller = LearningPathController(learning_path_service)
app.include_router(learning_path_controller.get_router(), prefix="/api")

# MATERIALS #
app.include_router(
    material_router,
    prefix="/api",
)

# Suppress noisy third-party loggers
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
    logger.info(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response


@app.middleware("http")
async def catch_all_undefined_endpoints(request: Request, call_next: Callable[[Request], Awaitable[JSONResponse]]) -> JSONResponse:
    logger.debug(f"Checking endpoint: {request.url.path}")
    response = await call_next(request)
    if response.status_code == 404:
        logger.warning(f"404 Not Found: {request.url.path}")
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "payload": {
                    "message": "No such endpoint",
                },
            },
        )
    return response


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3003, reload=True)

