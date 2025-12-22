"""
Centralized Exception Handling
Provides structured error responses and request ID tracing.
"""
import logging
import uuid
from typing import Callable

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception with structured error info."""
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        field: str = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.field = field
        super().__init__(message)


class NotFoundError(AppException):
    """Resource not found."""
    def __init__(self, message: str = "Resource not found", field: str = None):
        super().__init__(message, "NOT_FOUND", status.HTTP_404_NOT_FOUND, field)


class ValidationError(AppException):
    """Validation failed."""
    def __init__(self, message: str, field: str = None):
        super().__init__(message, "VALIDATION_ERROR", status.HTTP_422_UNPROCESSABLE_ENTITY, field)


class AuthenticationError(AppException):
    """Authentication failed."""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, "AUTH_REQUIRED", status.HTTP_401_UNAUTHORIZED)


class AuthorizationError(AppException):
    """Authorization failed."""
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, "FORBIDDEN", status.HTTP_403_FORBIDDEN)


class RateLimitError(AppException):
    """Rate limit exceeded."""
    def __init__(self, message: str = "Too many requests"):
        super().__init__(message, "RATE_LIMITED", status.HTTP_429_TOO_MANY_REQUESTS)


def _build_error_response(
    request_id: str,
    code: str,
    message: str,
    status_code: int,
    field: str = None
) -> dict:
    """Build standardized error response."""
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "field": field
        },
        "request_id": request_id
    }


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""

    @app.middleware("http")
    async def add_request_id(request: Request, call_next: Callable):
        """Inject request ID for tracing."""
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(f"[{request_id}] {exc.code}: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_response(
                request_id, exc.code, exc.message, exc.status_code, exc.field
            )
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(f"[{request_id}] HTTP {exc.status_code}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_response(
                request_id,
                f"HTTP_{exc.status_code}",
                str(exc.detail),
                exc.status_code
            )
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = getattr(request.state, "request_id", "unknown")
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            errors.append(f"{field}: {error['msg']}")

        message = "; ".join(errors)
        logger.warning(f"[{request_id}] Validation error: {message}")

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": message
                },
                "request_id": request_id
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.exception(f"[{request_id}] Unhandled exception: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_build_error_response(
                request_id,
                "INTERNAL_ERROR",
                "An unexpected error occurred",
                status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )
