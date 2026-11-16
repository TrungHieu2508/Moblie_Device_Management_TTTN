"""
Exception classes + HTTP exception handlers.

Tương đương GlobalExceptionHandler.java + common/exception/ErrorCode.java.
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.response import ApiResponse


# ── Custom Exception Classes ─────────────────────────────────

class MdmException(Exception):
    """Base exception cho toàn hệ thống."""
    def __init__(self, message: str, status_code: int = 400, error_code: str = "BAD_REQUEST"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


class NotFoundException(MdmException):
    """Tương đương IllegalArgumentException("X không tồn tại")."""
    def __init__(self, message: str):
        super().__init__(message, status_code=404, error_code="NOT_FOUND")


class UnauthorizedException(MdmException):
    """Token không hợp lệ hoặc không có quyền."""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401, error_code="UNAUTHORIZED")


class ForbiddenException(MdmException):
    """Không đủ quyền truy cập tài nguyên."""
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status_code=403, error_code="FORBIDDEN")


class ConflictException(MdmException):
    """Dữ liệu đã tồn tại hoặc bị xung đột."""
    def __init__(self, message: str):
        super().__init__(message, status_code=409, error_code="CONFLICT")


# ── Exception Handlers ────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """
    Đăng ký tất cả exception handlers vào FastAPI app.
    Tương đương @RestControllerAdvice trong Spring Boot.
    """

    @app.exception_handler(MdmException)
    async def mdm_exception_handler(request: Request, exc: MdmException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse.fail(exc.message, exc.error_code).model_dump(),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse.fail(str(exc.detail), "HTTP_ERROR").model_dump(),
        )

    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ApiResponse.fail(
                f"Validation failed: {exc.errors()}", "VALIDATION_ERROR"
            ).model_dump(),
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ApiResponse.fail(str(exc), "BAD_REQUEST").model_dump(),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        import logging
        logging.getLogger(__name__).error(f"Unexpected error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ApiResponse.fail(
                "Internal Server Error", "INTERNAL_ERROR"
            ).model_dump(),
        )
