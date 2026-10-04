"""
Devices Router — Tương đương DeviceController.java.

BUG FIX:
  - Frontend gọi PUT /devices/{id} → backend hỗ trợ cả PUT và PATCH
  - Frontend dùng device UUID string (id field) chứ không dùng device_id hardware string
  - Thêm GET /devices/{deviceId}/metrics endpoint cho DeviceDetailPage
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_device, get_current_user, require_admin
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.device import Device
from app.models.enums import DeviceStatus
from app.models.user import User
from app.schemas.command import CommandAckRequest, CommandCreateRequest, CommandDto
from app.schemas.device import (
    DeviceAssignRequest,
    DeviceDto,
    DeviceRegistrationRequest,
    DeviceRegistrationResponse,
    DeviceUpdateRequest,
)
from app.services.command_service import CommandService
from app.services.device_service import DeviceService
from app.ws.connection_manager import manager

router = APIRouter(prefix="/devices", tags=["Devices"])


# ── Registration (Public — no auth needed) ──────────────────────

@router.post("/register", response_model=ApiResponse[DeviceRegistrationResponse])
async def register_device(
    request: DeviceRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Thiết bị Android tự đăng ký. Không cần auth.
    Tương đương DeviceController.registerDevice().
    """
    data = await DeviceService.register_device(request, db)
    return ApiResponse.ok(data, "Thiết bị đã đăng ký thành công")


# ── CRUD for Admin ────────────────────────────────────────────────

@router.get("", response_model=ApiResponse[List[DeviceDto]])
async def get_devices(
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    campus_id: Optional[UUID] = Query(None, alias="campusId"),
    classroom_id: Optional[UUID] = Query(None, alias="classroomId"),
    status: Optional[DeviceStatus] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách thiết bị với filter tuỳ chọn."""
    data = await DeviceService.get_all_devices(db, school_id, campus_id, classroom_id, status)
    return ApiResponse.ok(data)


@router.get("/{device_uuid}", response_model=ApiResponse[DeviceDto])
async def get_device(
    device_uuid: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lấy thông tin chi tiết một thiết bị."""
    data = await DeviceService.get_device_by_id(device_uuid, db)
    return ApiResponse.ok(data)


@router.get("/{device_uuid}/metrics", response_model=ApiResponse[Optional[Dict[str, Any]]])
async def get_device_metrics(
    device_uuid: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy metrics real-time của thiết bị từ memory cache.
    BUG-8 FIX: DeviceDetailPage gọi GET /devices/{deviceId}/metrics
    """
    device = await DeviceService.get_device_by_id(device_uuid, db)
    metrics = manager.get_metrics(device.device_id)
    return ApiResponse.ok(metrics)


@router.put("/{device_uuid}", response_model=ApiResponse[DeviceDto])
async def update_device_put(
    device_uuid: UUID,
    request: DeviceUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật thông tin thiết bị (PUT — Frontend dùng PUT)."""
    data = await DeviceService.update_device(device_uuid, request, db)
    return ApiResponse.ok(data, "Cập nhật thành công")


@router.patch("/{device_uuid}", response_model=ApiResponse[DeviceDto])
async def update_device_patch(
    device_uuid: UUID,
    request: DeviceUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật thông tin thiết bị (PATCH)."""
    data = await DeviceService.update_device(device_uuid, request, db)
    return ApiResponse.ok(data, "Cập nhật thành công")


@router.patch("/{device_uuid}/assign", response_model=ApiResponse[DeviceDto])
async def assign_device(
    device_uuid: UUID,
    request: DeviceAssignRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Gán thiết bị vào trường/cơ sở/lớp học."""
    data = await DeviceService.assign_device(device_uuid, request, db)
    return ApiResponse.ok(data, "Thiết bị đã được gán thành công")


@router.delete("/{device_uuid}", response_model=ApiResponse[None])
async def delete_device(
    device_uuid: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Xóa thiết bị."""
    await DeviceService.delete_device(device_uuid, db)
    return ApiResponse.ok(message="Thiết bị đã được xóa")


# ── Commands shortcut — BUG-4 FIX ─────────────────────────────────
# Frontend gọi: POST /devices/{deviceId}/command  (DeviceDetailPage)
#               POST /devices/{deviceId}/commands (LiveClassesPage)

@router.post("/{device_uuid}/command", response_model=ApiResponse[CommandDto])
async def send_command(
    device_uuid: UUID,
    request: CommandCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Gửi lệnh tới thiết bị. Frontend gọi endpoint này."""
    data = await CommandService.create_command(device_uuid, request, current_user, db)
    return ApiResponse.ok(data, "Lệnh đã được tạo và gửi")


@router.post("/{device_uuid}/commands", response_model=ApiResponse[CommandDto])
async def send_command_alias(
    device_uuid: UUID,
    request: CommandCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Alias cho LiveClassesPage: POST /devices/{deviceId}/commands"""
    data = await CommandService.create_command(device_uuid, request, current_user, db)
    return ApiResponse.ok(data, "Lệnh đã được tạo và gửi")


# ── Agent ACK endpoint (REST fallback) ─────────────────────────────

@router.post("/agent/commands/{command_id}/ack", response_model=ApiResponse[None])
async def ack_command(
    command_id: UUID,
    request: CommandAckRequest,
    current_device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db),
):
    """
    Agent xác nhận thực thi lệnh qua REST (fallback nếu WS bị đứt).
    """
    await CommandService.acknowledge_command(current_device.device_id, command_id, request, db)
    return ApiResponse.ok(message="ACK đã được ghi nhận")
