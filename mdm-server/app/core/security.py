"""
Security utilities — JWT encode/decode + Password hashing.

Tương đương:
  - JwtService.java       → jwt_encode(), jwt_decode(), create_*_token()
  - SecurityConfig.java   → password_context (BCrypt)
  - JwtAuthenticationFilter.java → get_token_from_header() helper
"""

import asyncio
from datetime import datetime, timedelta, timezone
from functools import partial
from typing import Any, Optional

from jose import JWTError, jwt
import bcrypt

from app.core.config import settings

# ── Password Hashing ──────────────────────────────────────────
# BCrypt — tương đương BCryptPasswordEncoder trong Spring Security

def hash_password(password: str) -> str:
    """Hash password bằng BCrypt."""
    salt = bcrypt.gensalt()
    pwd_bytes = password.encode('utf-8')
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra password có khớp với hash không (synchronous)."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


async def verify_password_async(plain_password: str, hashed_password: str) -> bool:
    """
    Async version: chạy bcrypt.checkpw trong thread pool để không block event loop.
    bcrypt là CPU-bound (~200-500ms) nên PHẢI dùng hàm này trong async context.
    """
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(
            None,
            partial(bcrypt.checkpw,
                    plain_password.encode('utf-8'),
                    hashed_password.encode('utf-8'))
        )
    except Exception:
        return False


# ── JWT Helpers ───────────────────────────────────────────────
ALGORITHM = "HS256"


def _create_token(subject: str, expire_seconds: int, extra_claims: dict = None) -> str:
    """
    Tạo JWT token — tương đương JwtService.generateToken().

    Args:
        subject: Giá trị lưu vào claim "sub" (username hoặc deviceId)
        expire_seconds: Thời hạn token tính bằng giây
        extra_claims: Claims bổ sung (role, userId, type, v.v.)
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(seconds=expire_seconds)

    payload = {
        "sub": subject,
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def create_access_token(username: str, role: str, user_id: str) -> str:
    """
    Tạo Access Token cho Web Admin.
    Tương đương JwtService.generateAccessToken().
    """
    return _create_token(
        subject=username,
        expire_seconds=settings.jwt_access_expire_seconds,
        extra_claims={"role": role, "userId": user_id},
    )


def create_refresh_token(username: str) -> str:
    """
    Tạo Refresh Token.
    Tương đương JwtService.generateRefreshToken().
    """
    return _create_token(
        subject=username,
        expire_seconds=settings.jwt_refresh_expire_seconds,
    )


def create_device_token(device_id: str) -> str:
    """
    Tạo Device Token cho Android Agent.
    Tương đương JwtService.generateDeviceToken().
    Thêm claim "type": "DEVICE" để phân biệt với user token.
    """
    return _create_token(
        subject=device_id,
        expire_seconds=settings.jwt_device_expire_seconds,
        extra_claims={"type": "DEVICE"},
    )


def decode_token(token: str) -> Optional[dict[str, Any]]:
    """
    Giải mã và xác thực JWT token.
    Trả về payload dict nếu hợp lệ, None nếu không hợp lệ / hết hạn.

    Tương đương JwtService.extractAllClaims() + isTokenValid().
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def extract_subject(token: str) -> Optional[str]:
    """Lấy 'sub' claim từ token. Tương đương JwtService.extractSubject()."""
    payload = decode_token(token)
    return payload.get("sub") if payload else None
