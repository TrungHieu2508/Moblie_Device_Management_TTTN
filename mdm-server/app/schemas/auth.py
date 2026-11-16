
from typing import Optional
from uuid import UUID

from app.models.enums import UserRole
from app.schemas.base import CamelModel


class LoginRequest(CamelModel):
    username: str
    password: str


class UserDto(CamelModel):
    """Thông tin user trả về trong AuthResponse."""
    id: UUID
    username: str
    full_name: str
    role: UserRole
    school_id: Optional[UUID] = None
    campus_id: Optional[UUID] = None


class AuthResponse(CamelModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int   # Giây
    user: UserDto


class RefreshTokenRequest(CamelModel):
    refresh_token: str


class LogoutRequest(CamelModel):
    refresh_token: str
