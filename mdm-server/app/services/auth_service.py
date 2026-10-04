"""
AuthService — Tương đương AuthService.java.

Xử lý: login, refresh token, logout.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
    verify_password_async,
)
from app.models.enums import UserRole
from app.models.user import RefreshToken, User
from app.schemas.auth import AuthResponse, LoginRequest, UserDto


class AuthService:

    @staticmethod
    async def login(request: LoginRequest, db: AsyncSession) -> AuthResponse:
        """
        Xác thực user và cấp token.
        Tương đương AuthService.login().
        """
        # 1. Tìm user
        result = await db.execute(select(User).where(User.username == request.username))
        user = result.scalar_one_or_none()

        if not user or not await verify_password_async(request.password, user.password_hash):
            raise UnauthorizedException("Tên đăng nhập hoặc mật khẩu không đúng")

        if not user.is_active:
            raise UnauthorizedException("Tài khoản đã bị vô hiệu hóa")

        # 2. Tạo tokens
        role_str = f"ROLE_{user.role}"
        access_token = create_access_token(
            username=user.username,
            role=role_str,
            user_id=str(user.id),
        )
        refresh_token_str = create_refresh_token(user.username)

        # 3. Xóa refresh token cũ, lưu token mới (tương đương deleteByUserId + save)
        await db.execute(
            delete(RefreshToken).where(RefreshToken.user_id == user.id)
        )
        refresh_token = RefreshToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token=refresh_token_str,
            expires_at=datetime.now(timezone.utc).replace(
                second=datetime.now(timezone.utc).second
            ),
        )
        # Tính expires_at từ settings
        from app.core.config import settings
        from datetime import timedelta
        refresh_token.expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=settings.jwt_refresh_expire_seconds
        )
        db.add(refresh_token)

        # 4. Cập nhật last_login_at
        user.last_login_at = datetime.now(timezone.utc)

        await db.commit()

        # 5. Build response
        user_dto = UserDto(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=UserRole(user.role),
            school_id=user.school_id,
            campus_id=user.campus_id,
        )

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            expires_in=settings.jwt_access_expire_seconds,
            user=user_dto,
        )

    @staticmethod
    async def refresh_token(token: str, db: AsyncSession) -> AuthResponse:
        """
        Cấp access token mới từ refresh token.
        Tương đương AuthService.refreshToken().
        """
        payload = decode_token(token)
        if not payload:
            raise UnauthorizedException("Refresh token không hợp lệ hoặc đã hết hạn")

        username = payload.get("sub")

        # Kiểm tra token trong DB
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token == token)
        )
        saved_token = result.scalar_one_or_none()

        if not saved_token or saved_token.is_revoked:
            raise UnauthorizedException("Refresh token đã bị thu hồi")

        if saved_token.expires_at < datetime.now(timezone.utc):
            raise UnauthorizedException("Refresh token đã hết hạn")

        # Lấy user
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise UnauthorizedException("Tài khoản không tồn tại hoặc đã bị khóa")

        from app.core.config import settings
        role_str = f"ROLE_{user.role}"
        new_access_token = create_access_token(
            username=user.username,
            role=role_str,
            user_id=str(user.id),
        )

        user_dto = UserDto(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=UserRole(user.role),
            school_id=user.school_id,
            campus_id=user.campus_id,
        )

        return AuthResponse(
            access_token=new_access_token,
            refresh_token=token,
            expires_in=settings.jwt_access_expire_seconds,
            user=user_dto,
        )

    @staticmethod
    async def logout(refresh_token: str, db: AsyncSession) -> None:
        """
        Thu hồi refresh token.
        Tương đương AuthService.logout().
        """
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token == refresh_token)
        )
        token_obj = result.scalar_one_or_none()

        if token_obj:
            token_obj.is_revoked = True
            await db.commit()
