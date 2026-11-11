"""
Devices Router — Quản lý Thiết bị (Mô hình 2 Roles: SUPER_ADMIN & ADMIN/IT_ADMIN).
Áp dụng phân quyền theo Khu vực (Campus Scope):
  - SUPER_ADMIN: Quản lý và điều khiển thiết bị trên toàn hệ thống.
  - IT_ADMIN / ADMIN: Chỉ được xem, chỉnh sửa và điều khiển thiết bị thuộc Khu vực (campus_id) được phân công.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_current_device,
    require_admin,
    resolve_scoped_campus_id,
    verify_campus_access,
)
from app.core.exceptions import NotFoundException
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
    """
    data = await DeviceService.register_device(request, db)
    return ApiResponse.ok(data, "Thiết bị đã đăng ký thành công")


# ── CRUD for Admin (Scoped by Campus) ───────────────────────────

@router.get("", response_model=ApiResponse[List[DeviceDto]])
async def get_devices(
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    campus_id: Optional[UUID] = Query(None, alias="campusId"),
    classroom_id: Optional[UUID] = Query(None, alias="classroomId"),
    status: Optional[DeviceStatus] = Query(None),
    search: Optional[str] = Query(None),
    android_version: Optional[str] = Query(None, alias="androidVersion"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách thiết bị theo phạm vi Khu vực (Campus) của người dùng."""
    scoped_campus_id = resolve_scoped_campus_id(current_user, campus_id)
    data = await DeviceService.get_all_devices(
        db,
        school_id=school_id,
        campus_id=scoped_campus_id,
        classroom_id=classroom_id,
        status=status,
        search=search,
        android_version=android_version,
    )
    return ApiResponse.ok(data)


@router.get("/{device_uuid}", response_model=ApiResponse[DeviceDto])
async def get_device(
    device_uuid: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lấy thông tin chi tiết một thiết bị (kiểm tra quyền Khu vực)."""
    data = await DeviceService.get_device_by_id(device_uuid, db)
    verify_campus_access(current_user, data.campus.id if data.campus else None)
    return ApiResponse.ok(data)


@router.get("/{device_id_or_uuid}/metrics", response_model=ApiResponse[Optional[Dict[str, Any]]])
async def get_device_metrics(
    device_id_or_uuid: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy metrics real-time của thiết bị từ memory cache.
    Hỗ trợ truyền cả UUID (id) lẫn hardware string (deviceId).
    """
    try:
        parsed_uuid = UUID(device_id_or_uuid)
        device = await DeviceService.get_device_by_id(parsed_uuid, db)
        verify_campus_access(current_user, device.campus.id if device.campus else None)
        hw_device_id = device.device_id
    except ValueError:
        res = await db.execute(select(Device).where(Device.device_id == device_id_or_uuid))
        dev_model = res.scalar_one_or_none()
        if not dev_model:
            raise NotFoundException("Thiết bị không tồn tại")
        verify_campus_access(current_user, dev_model.campus_id)
        hw_device_id = device_id_or_uuid
    metrics = manager.get_metrics(hw_device_id)
    return ApiResponse.ok(metrics)


@router.put("/{device_uuid}", response_model=ApiResponse[DeviceDto])
async def update_device_put(
    device_uuid: UUID,
    request: DeviceUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật thông tin thiết bị (PUT — kiểm tra quyền Khu vực)."""
    existing = await DeviceService.get_device_by_id(device_uuid, db)
    verify_campus_access(current_user, existing.campus.id if existing.campus else None)
    if request.campus_id is not None:
        verify_campus_access(current_user, request.campus_id)
    data = await DeviceService.update_device(device_uuid, request, db)
    return ApiResponse.ok(data, "Cập nhật thành công")


@router.patch("/{device_uuid}", response_model=ApiResponse[DeviceDto])
async def update_device_patch(
    device_uuid: UUID,
    request: DeviceUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật thông tin thiết bị (PATCH — kiểm tra quyền Khu vực)."""
    existing = await DeviceService.get_device_by_id(device_uuid, db)
    verify_campus_access(current_user, existing.campus.id if existing.campus else None)
    if request.campus_id is not None:
        verify_campus_access(current_user, request.campus_id)
    data = await DeviceService.update_device(device_uuid, request, db)
    return ApiResponse.ok(data, "Cập nhật thành công")


@router.patch("/{device_uuid}/assign", response_model=ApiResponse[DeviceDto])
async def assign_device(
    device_uuid: UUID,
    request: DeviceAssignRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Gán thiết bị vào trường/cơ sở/lớp học (kiểm tra quyền Khu vực)."""
    existing = await DeviceService.get_device_by_id(device_uuid, db)
    verify_campus_access(current_user, existing.campus.id if existing.campus else None)
    if request.campus_id is not None:
        verify_campus_access(current_user, request.campus_id)
    data = await DeviceService.assign_device(device_uuid, request, db)
    return ApiResponse.ok(data, "Thiết bị đã được gán thành công")


@router.delete("/{device_uuid}", response_model=ApiResponse[None])
async def delete_device(
    device_uuid: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Xóa thiết bị (kiểm tra quyền Khu vực)."""
    existing = await DeviceService.get_device_by_id(device_uuid, db)
    verify_campus_access(current_user, existing.campus.id if existing.campus else None)
    await DeviceService.delete_device(device_uuid, db)
    return ApiResponse.ok(message="Thiết bị đã được xóa")


# ── Commands shortcut ─────────────────────────────────────────────

@router.post("/{device_uuid}/command", response_model=ApiResponse[CommandDto])
async def send_command(
    device_uuid: UUID,
    request: CommandCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Gửi lệnh tới thiết bị (kiểm tra quyền Khu vực)."""
    data = await CommandService.create_command(device_uuid, request, current_user, db)
    return ApiResponse.ok(data, "Lệnh đã được tạo và gửi")


@router.post("/{device_uuid}/commands", response_model=ApiResponse[CommandDto])
async def send_command_alias(
    device_uuid: UUID,
    request: CommandCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Alias: POST /devices/{deviceId}/commands (kiểm tra quyền Khu vực)."""
    data = await CommandService.create_command(device_uuid, request, current_user, db)
    return ApiResponse.ok(data, "Lệnh đã được tạo và gửi")


@router.get("/{device_uuid}/commands", response_model=ApiResponse[List[CommandDto]])
async def get_device_commands_list(
    device_uuid: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách lịch sử lệnh của thiết bị (kiểm tra quyền Khu vực)."""
    existing = await DeviceService.get_device_by_id(device_uuid, db)
    verify_campus_access(current_user, existing.campus.id if existing.campus else None)
    paged = await CommandService.get_command_history(device_uuid, page, size, db)
    return ApiResponse.ok(paged.items)


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
