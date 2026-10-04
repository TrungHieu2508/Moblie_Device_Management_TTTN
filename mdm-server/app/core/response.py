"""
Standard API Response wrapper — Tương đương ApiResponse.java.

Tất cả REST API endpoint đều wrap kết quả trong format này để
Web Dashboard không phải thay đổi code parsing.
"""

from typing import Any, Generic, Optional, TypeVar

from app.schemas.base import CamelModel

T = TypeVar("T")


class ApiResponse(CamelModel, Generic[T]):
    """
    Chuẩn response chung toàn hệ thống.
    Output JSON dùng camelCase: { "success": true, "message": "...", "data": ..., "errorCode": "..." }
    """
    success: bool
    message: str
    data: Optional[T] = None
    error_code: Optional[str] = None

    @classmethod
    def ok(cls, data: Any = None, message: str = "Success") -> "ApiResponse":
        """Tương đương ApiResponse.success()"""
        return cls(success=True, message=message, data=data)

    @classmethod
    def fail(cls, message: str, error_code: str = "BAD_REQUEST") -> "ApiResponse":
        """Tương đương ApiResponse.error()"""
        return cls(success=False, message=message, error_code=error_code)
