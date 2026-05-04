import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

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
from controllers.ai_token_verify_controller import AITokenVerifyController
from database.init_db import init_db, close_db
import logging
import litellm
from typing import Awaitable, Callable
import uvicorn

load_dotenv()

logger = logging.getLogger("bridge_microservice")
logger.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)


async def _audio_janitor() -> None:
    """Background task: every hour, delete files in static/audio that
    are older than AUDIO_TTL_HOURS (default 24). Without this the
    listening-task generator slowly fills the VM's disk — every task
    writes a unique <uuid>.mp3 and nothing ever cleans them up."""
    import asyncio
    import time

    audio_dir = os.path.join("static", "audio")
    ttl_hours = float(os.environ.get("AUDIO_TTL_HOURS", "24"))
    sleep_seconds = 60 * 60  # one sweep per hour
    while True:
        try:
            if os.path.isdir(audio_dir):
                cutoff = time.time() - ttl_hours * 3600
                removed = 0
                for name in os.listdir(audio_dir):
                    path = os.path.join(audio_dir, name)
                    try:
                        if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                            os.remove(path)
                            removed += 1
                    except OSError:
                        # File raced with another writer or permissions
                        # changed underfoot. Skip; we'll catch it next pass.
                        continue
                if removed:
                    logger.info("Audio janitor removed %d expired files", removed)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Audio janitor sweep failed: %s", exc)
        await asyncio.sleep(sleep_seconds)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Initialise the database on startup and dispose of pools on shutdown."""
    import asyncio

    await init_db()
    logger.info("Bridge database ready.")
    janitor = asyncio.create_task(_audio_janitor(), name="audio-janitor")
    try:
        yield
    finally:
        janitor.cancel()
        try:
            await janitor
        except asyncio.CancelledError:
            pass
        await close_db()
        logger.info("Bridge database shut down.")


app = FastAPI(
    lifespan=lifespan,
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


@app.get("/health", include_in_schema=False)
@app.get("/api/health", include_in_schema=False)
async def health() -> dict:
    return {"status": "ok", "service": "bridge"}

error_handler_middleware_instance = ErrorHandlingMiddleware(app)

app.add_middleware(ErrorHandlingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-User-Id", "X-User-Email", "X-User-Role", "X-Internal-Service-Key"],
)

# Instantiate common services
ai_service = AI_Service()
vector_db_service = VectorDBService()

from services.user_service import UserService as BridgeUserService
_writing_user_service = BridgeUserService()
app.include_router(
    WritingController(
        WritingTaskService(vector_db_service, ai_service),
        _writing_user_service,
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
from database.connection import async_session
learning_path_service = LearningPathService(session_factory=async_session)
learning_path_controller = LearningPathController(learning_path_service)
app.include_router(learning_path_controller.get_router(), prefix="/api")

# MATERIALS #
app.include_router(
    material_router,
    prefix="/api",
)

# AI TOKEN VERIFY #
app.include_router(
    AITokenVerifyController().get_router(),
    prefix="/api",
)

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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_handler_middleware_instance.handle_validation_error(exc)


@app.middleware("http")
async def log_requests(request: Request, call_next: Callable[[Request], Awaitable[JSONResponse]]) -> JSONResponse:
    logger.info(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response


# NB: do NOT replace every 404 response here — that would clobber the
# legitimate `raise_with_code(CODE, 404, "...")` responses our handlers
# emit (e.g. "INPUT_VALIDATION_FAILED: Token id … not found"), erasing
# the structured code the frontend's parseApiError relies on.
#
# Unmatched-route 404s come from Starlette's default handler with the
# body `{"detail": "Not Found"}` — that's already a shape our frontend
# handles (it falls through to the generic translation), so we leave
# it alone.


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3003, reload=True)

