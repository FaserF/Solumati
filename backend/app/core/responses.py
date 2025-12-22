"""
Standardized API Response Models
Provides unified response format across all endpoints.
"""

from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""

    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    errors: Optional[List[str]] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response for list endpoints."""

    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorDetail(BaseModel):
    """Structured error detail."""

    code: str
    message: str
    field: Optional[str] = None


class APIError(BaseModel):
    """Standard error response."""

    success: bool = False
    error: ErrorDetail
    request_id: Optional[str] = None
