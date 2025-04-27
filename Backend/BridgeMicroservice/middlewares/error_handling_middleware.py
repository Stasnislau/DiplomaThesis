from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from datetime import datetime
from typing import Union, Callable, Dict, List, Any
from starlette.middleware.base import BaseHTTPMiddleware


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> JSONResponse:
        try:
            response: JSONResponse = await call_next(request)
            return response

        except HTTPException as http_exc:
            error_payload: Union[List[Dict[str, Any]], None] = None
            message: str

            if isinstance(http_exc.detail, (list, dict)):
                message = "HTTP error occurred"
                error_payload = http_exc.detail
            else:
                message = str(http_exc.detail)

            return self.handle_error(
                status_code=http_exc.status_code,
                message=message,
                errors=error_payload
            )

        except Exception as exc:
            print(f"Unexpected error intercepted: {exc}")
            return self.handle_error(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="Internal Server Error"
            )

    def handle_error(
        self, status_code: int, message: str, errors: Union[List[Dict[str, Any]], None] = None
    ) -> JSONResponse:
        response_body: Dict = {
            "success": False,
            "payload": {"message": message, "timestamp": datetime.now().isoformat()},
        }

        if errors is not None:
            response_body["payload"]["errors"] = errors

        return JSONResponse(status_code=status_code, content=response_body)

    def handle_validation_error(self, exc: RequestValidationError) -> JSONResponse:
        return self.handle_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Validation error",
            errors=[{"loc": err["loc"], "msg": err["msg"]} for err in exc.errors()],
        )
