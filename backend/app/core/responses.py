"""
Standardized API Response Models
Provides unified response format across all endpoints.
"""
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = True
    data: T | None = None
    message: str | None = None
    errors: list[str] | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response for list endpoints."""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorDetail(BaseModel):
    """Structured error detail."""
    code: str
    message: str
    field: str | None = None


class APIError(BaseModel):
    """Standard error response."""
    success: bool = False
    error: ErrorDetail
    request_id: str | None = None
