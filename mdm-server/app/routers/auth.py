"""
Auth Router — Tương đương AuthController.java.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.response import ApiResponse
from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, LogoutRequest, RefreshTokenRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[AuthResponse])
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Đăng nhập, nhận JWT access + refresh token."""
    data = await AuthService.login(request, db)
    return ApiResponse.ok(data, "Đăng nhập thành công")


@router.post("/refresh", response_model=ApiResponse[AuthResponse])
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Cấp lại access token từ refresh token."""
    data = await AuthService.refresh_token(request.refresh_token, db)
    return ApiResponse.ok(data, "Token đã được gia hạn")


@router.post("/logout", response_model=ApiResponse[None])
async def logout(request: LogoutRequest, db: AsyncSession = Depends(get_db)):
    """Thu hồi refresh token (đăng xuất)."""
    await AuthService.logout(request.refresh_token, db)
    return ApiResponse.ok(message="Đăng xuất thành công")
