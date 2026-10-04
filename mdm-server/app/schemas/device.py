"""
Device Schemas — Tương đương DTOs trong domain/device/dto/.
Bao gồm cả Registration Response khớp với Android Agent.
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from app.models.enums import DeviceStatus
from app.schemas.base import CamelModel


# ── Sub-schemas ────────────────────────────────────────────────

class SchoolBasicInfo(CamelModel):
    id: UUID
    name: str
    code: str


class CampusBasicInfo(CamelModel):
    id: UUID
    name: str
    code: str


class ClassroomBasicInfo(CamelModel):
    id: UUID
    name: str
    code: str


# ── Device ─────────────────────────────────────────────────────

class DeviceDto(CamelModel):
    """Tương đương DeviceDto.java — trả về trong hầu hết device endpoints."""
    id: UUID
    device_id: str
    device_name: Optional[str] = None
    serial_number: Optional[str] = None
    model: Optional[str] = None
    android_version: Optional[str] = None
    agent_version: Optional[str] = None
    status: DeviceStatus
    school: Optional[SchoolBasicInfo] = None
    campus: Optional[CampusBasicInfo] = None
    classroom: Optional[ClassroomBasicInfo] = None
    last_heartbeat_at: Optional[datetime] = None
    registered_at: Optional[datetime] = None
    notes: Optional[str] = None
    # Real-time data từ ConnectionManager (không phải từ DB)
    metrics: Optional[Dict[str, Any]] = None
    current_app: Optional[Dict[str, Any]] = None


class DeviceRegistrationRequest(CamelModel):
    """Tương đương DeviceRegistrationRequest.java — Agent tự đăng ký."""
    device_id: str
    device_name: Optional[str] = None
    serial_number: Optional[str] = None
    model: Optional[str] = None
    android_version: Optional[str] = None
    agent_version: Optional[str] = None
    enrollment_code: Optional[str] = None  # Mã 6 ký tự từ QR code


class ServerConfig(CamelModel):
    """Cấu hình server trả về cho Agent."""
    heartbeat_interval_seconds: int = 30
    websocket_url: str


class DeviceRegistrationResponse(CamelModel):
    """
    Tương đương DeviceRegistrationResponse.java — trả về JWT device token.
    Khớp với Android Agent: RegistrationResponse.kt
    """
    device_uuid: UUID
    registration_token: str
    token_expires_at: Optional[str] = None
    campus_name: Optional[str] = None
    school_name: Optional[str] = None
    classroom_name: Optional[str] = None
    server_config: ServerConfig


class DeviceAssignRequest(CamelModel):
    """Gán thiết bị vào trường/cơ sở/lớp."""
    school_id: Optional[UUID] = None
    campus_id: Optional[UUID] = None
    classroom_id: Optional[UUID] = None
    notes: Optional[str] = None


class DeviceUpdateRequest(CamelModel):
    """Cập nhật thông tin thiết bị."""
    device_name: Optional[str] = None
    notes: Optional[str] = None
    school_id: Optional[UUID] = None
    campus_id: Optional[UUID] = None
    classroom_id: Optional[UUID] = None


# ── Enrollment ─────────────────────────────────────────────────

class CreateEnrollmentRequest(CamelModel):
    """Tương đương CreateEnrollmentRequest.java"""
    school_id: UUID
    campus_id: UUID
    classroom_id: Optional[UUID] = None
    expires_in_days: Optional[int] = 7
    max_uses: Optional[int] = 0


class EnrollmentDto(CamelModel):
    """Tương đương EnrollmentDto.java"""
    id: UUID
    code: str
    school_id: UUID
    school_name: str
    campus_id: UUID
    campus_name: str
    classroom_id: Optional[UUID] = None
    classroom_name: Optional[str] = None
    expires_at: Optional[datetime] = None
    max_uses: int
    current_uses: int
    is_active: bool
