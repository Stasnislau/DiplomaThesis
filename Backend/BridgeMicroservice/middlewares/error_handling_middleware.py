from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from datetime import datetime
from typing import Union, Callable, Dict
from starlette.middleware.base import BaseHTTPMiddleware


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> JSONResponse:
        try:
            response: JSONResponse = await call_next(request)
            return response

        except Exception as exc:
            print(f"Unexpected error: {exc}")
            return self.handle_error(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, message=str(exc)
            )

    def handle_error(
        self, status_code: int, message: str, errors: Union[list, Dict, None] = None
    ) -> JSONResponse:
        response_body: Dict = {
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
