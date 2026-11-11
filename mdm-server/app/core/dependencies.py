"""
FastAPI Dependencies — Dependency Injection cho Authentication & Authorization.

Mô hình 2 Roles:
  - SUPER_ADMIN: Quản trị cấp cao toàn hệ thống.
  - IT_ADMIN / ADMIN: Quản trị vận hành & thiết bị (dùng chung cho IT và giáo viên).
"""

from typing import Optional
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.db.session import get_db
from app.models.device import Device
from app.models.enums import UserRole
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

ALLOWED_USER_ROLES = {UserRole.SUPER_ADMIN.value, UserRole.IT_ADMIN.value, UserRole.ADMIN.value}


# ── User Authentication ────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency: Xác thực JWT và trả về User hiện tại.
    Chỉ chấp nhận các tài khoản có role hợp lệ (SUPER_ADMIN, IT_ADMIN, ADMIN).
    """
    if not credentials:
        raise UnauthorizedException("Vui lòng đăng nhập để tiếp tục")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise UnauthorizedException("Token không hợp lệ hoặc đã hết hạn")

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
    if user.role not in ALLOWED_USER_ROLES:
        raise ForbiddenException("Vai trò tài khoản không còn được hỗ trợ trong hệ thống")

    return user


# ── Device Authentication ─────────────────────────────────────

async def get_current_device(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Device:
    """
    Dependency: Xác thực Device JWT và trả về Device.
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
    """
    allowed = [r.value for r in roles]

    async def _check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise ForbiddenException(
                f"Bạn không có quyền thực hiện hành động này. Yêu cầu: {allowed}"
            )
        return current_user

    return _check_role


# ── Convenience shortcuts (2-Role Model) ───────────────────────

require_super_admin = require_roles(UserRole.SUPER_ADMIN)
require_admin = require_roles(UserRole.SUPER_ADMIN, UserRole.IT_ADMIN, UserRole.ADMIN)


# ── Campus / Area Scope Helpers for Admin ──────────────────────

def is_super_admin(user: User) -> bool:
    """Kiểm tra xem user có phải là SUPER_ADMIN không."""
    return user.role == UserRole.SUPER_ADMIN.value


def resolve_scoped_campus_id(
    current_user: User,
    requested_campus_id: Optional[UUID] = None,
) -> Optional[UUID]:
    """
    Trả về campus_id hợp lệ theo phạm vi quyền của current_user:
      - SUPER_ADMIN: được phép xem toàn bộ hoặc lọc theo requested_campus_id bất kỳ.
      - IT_ADMIN / ADMIN: bắt buộc giới hạn trong current_user.campus_id.
        Nếu cố tình truyền requested_campus_id của khu vực khác -> ném 403 Forbidden.
    """
    if is_super_admin(current_user):
        return requested_campus_id

    if not current_user.campus_id:
        raise ForbiddenException("Tài khoản Admin chưa được phân công Khu vực (Campus) quản lý")

    if requested_campus_id and requested_campus_id != current_user.campus_id:
        raise ForbiddenException("Bạn chỉ có quyền xem dữ liệu thuộc Khu vực (Campus) được phân công")

    return current_user.campus_id


def verify_campus_access(
    current_user: User,
    target_campus_id: Optional[UUID],
) -> None:
    """
    Kiểm tra quyền thao tác của Admin trên tài nguyên thuộc target_campus_id.
      - SUPER_ADMIN: toàn quyền.
      - IT_ADMIN / ADMIN: chỉ được thao tác nếu target_campus_id == current_user.campus_id.
    """
    if is_super_admin(current_user):
        return

    if not current_user.campus_id or target_campus_id != current_user.campus_id:
        raise ForbiddenException("Bạn không có quyền truy cập hoặc thao tác dữ liệu thuộc Khu vực (Campus) khác")


# ── WebSocket Auth Helper ─────────────────────────────────────

async def get_device_from_ws_token(
    token: Optional[str],
    db: AsyncSession,
) -> Optional[Device]:
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
    if not user or not user.is_active or user.role not in ALLOWED_USER_ROLES:
        return None
    return user
