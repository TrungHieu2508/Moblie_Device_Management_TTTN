"""
FastAPI Dependencies — Dependency Injection cho Authentication & Authorization.

Tương đương:
  - JwtAuthenticationFilter.java  → Middleware xác thực JWT
  - @PreAuthorize("hasRole(...)")  → require_roles() dependency
  - Principal.getName()           → get_current_user(), get_current_device()
"""

from typing import Optional
from uuid import UUID

from fastapi import Depends, Query, WebSocket
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.db.session import get_db
from app.models.device import Device
from app.models.enums import UserRole
from app.models.user import User

# HTTPBearer tự động đọc Header "Authorization: Bearer <token>"
bearer_scheme = HTTPBearer(auto_error=False)


# ── User Authentication ────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency: Xác thực JWT và trả về User hiện tại.
    Tương đương JwtAuthenticationFilter (handleUserAuthentication).

    Raise UnauthorizedException nếu:
      - Không có token
      - Token không hợp lệ / hết hạn
      - User không tồn tại / bị khóa
    """
    if not credentials:
        raise UnauthorizedException("Vui lòng đăng nhập để tiếp tục")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise UnauthorizedException("Token không hợp lệ hoặc đã hết hạn")

    # Token type "DEVICE" không được dùng cho user endpoints
    if payload.get("type") == "DEVICE":
        raise UnauthorizedException("Token thiết bị không được phép dùng cho endpoint này")

    username: str = payload.get("sub")
    if not username:
        raise UnauthorizedException("Token không hợp lệ")

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("Tài khoản không tồn tại")
    if not user.is_active:
        raise UnauthorizedException("Tài khoản đã bị vô hiệu hóa")

    return user


# ── Device Authentication ─────────────────────────────────────

async def get_current_device(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Device:
    """
    Dependency: Xác thực Device JWT và trả về Device.
    Tương đương JwtAuthenticationFilter (handleDeviceAuthentication).

    Android Agent gửi token với prefix "Bearer" nhưng payload có "type": "DEVICE".
    """
    if not credentials:
        raise UnauthorizedException("Device token không hợp lệ")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise UnauthorizedException("Device token không hợp lệ hoặc đã hết hạn")

    if payload.get("type") != "DEVICE":
        raise UnauthorizedException("Token không phải là device token")

    device_id: str = payload.get("sub")
    if not device_id:
        raise UnauthorizedException("Device token không hợp lệ")

    result = await db.execute(select(Device).where(Device.device_id == device_id))
    device = result.scalar_one_or_none()

    if not device:
        raise UnauthorizedException("Thiết bị không tồn tại")

    return device


# ── Role-based Authorization ───────────────────────────────────

def require_roles(*roles: UserRole):
    """
    Dependency factory: Kiểm tra user có role trong danh sách được phép không.
    Tương đương @PreAuthorize("hasAnyRole(...)") trong Spring Boot.

    Ví dụ:
        @router.get("/devices", dependencies=[Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.IT_ADMIN))])
    """
    async def _check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in [r.value for r in roles]:
            raise ForbiddenException(
                f"Bạn không có quyền thực hiện hành động này. Yêu cầu: {[r.value for r in roles]}"
            )
        return current_user

    return _check_role


# ── Convenience shortcuts (dùng trong router) ──────────────────

require_super_admin = require_roles(UserRole.SUPER_ADMIN)
require_admin = require_roles(UserRole.SUPER_ADMIN, UserRole.IT_ADMIN)
require_any_staff = require_roles(UserRole.SUPER_ADMIN, UserRole.IT_ADMIN, UserRole.TEACHER)


# ── WebSocket Auth Helper ─────────────────────────────────────

async def get_device_from_ws_token(
    token: Optional[str],
    db: AsyncSession,
) -> Optional[Device]:
    """
    Xác thực JWT từ WebSocket query param ?token=...
    Tương đương JwtChannelInterceptor.java.
    Trả về Device nếu hợp lệ, None nếu không.
    """
    if not token:
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "DEVICE":
        return None

    device_id = payload.get("sub")
    if not device_id:
        return None

    result = await db.execute(select(Device).where(Device.device_id == device_id))
    return result.scalar_one_or_none()


async def get_user_from_ws_token(
    token: Optional[str],
    db: AsyncSession,
) -> Optional[User]:
    """
    Xác thực JWT user từ WebSocket query param ?token=...
    Dùng cho Dashboard WebSocket connection.
    """
    if not token:
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") == "DEVICE":
        return None

    username = payload.get("sub")
    if not username:
        return None

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    return user if (user and user.is_active) else None
