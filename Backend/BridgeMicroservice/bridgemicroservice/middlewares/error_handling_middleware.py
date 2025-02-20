from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
from datetime import datetime
from typing import Union, Any
from starlette.middleware.base import BaseHTTPMiddleware
import traceback
import json


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)

            if response.status_code > 400 and response.status_code < 600:
                raise HTTPException(
                    status_code=response.status_code, detail=response.content
                )

            return response

        except Exception as exc:
            print(f"Unexpected error: {exc}")
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
