from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
from datetime import datetime
from typing import Union, Any
from starlette.middleware.base import BaseHTTPMiddleware
import traceback


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except RequestValidationError as exc:
            return self.handle_validation_error(exc)
        except HTTPException as exc:
            return self.handle_error(status_code=exc.status_code, message=exc.detail)
        except Exception as exc:
            print(f"Unexpected error: {exc}")
            print(traceback.format_exc())
            return self.handle_error(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, message=str(exc)
            )

    def handle_error(
        self, status_code: int, message: str, errors: Union[list, dict, None] = None
    ) -> JSONResponse:
        response_body = {
            "success": False,
            "payload": {"message": message, "timestamp": datetime.now().isoformat()},
        }

        if errors:
            response_body["payload"]["errors"] = errors

        return JSONResponse(status_code=status_code, content=response_body)

    def handle_validation_error(self, exc: RequestValidationError) -> JSONResponse:
        return self.handle_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Validation error",
            errors=[{"loc": err["loc"], "msg": err["msg"]} for err in exc.errors()],
        )
