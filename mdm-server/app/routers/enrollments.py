"""
Enrollments Router — Quản lý Mã Ghi Danh QR theo Khu vực (Campus Scope).
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin, resolve_scoped_campus_id, verify_campus_access
from app.core.exceptions import NotFoundException
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.device import EnrollmentProfile
from app.models.user import User
from app.schemas.device import CreateEnrollmentRequest, EnrollmentDto
from app.services.device_service import DeviceService

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


@router.get("", response_model=ApiResponse[List[EnrollmentDto]])
async def get_enrollments(
    campus_id: Optional[UUID] = Query(None, alias="campusId"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách mã đăng ký đang hoạt động (giới hạn theo Khu vực của Admin)."""
    scoped_campus_id = resolve_scoped_campus_id(current_user, campus_id)
    data = await DeviceService.get_enrollments(scoped_campus_id, db)
    return ApiResponse.ok(data)


@router.post("", response_model=ApiResponse[EnrollmentDto])
async def create_enrollment(
    request: CreateEnrollmentRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Tạo mã đăng ký QR cho thiết bị (kiểm tra quyền Khu vực)."""
    verify_campus_access(current_user, request.campus_id)
    data = await DeviceService.create_enrollment(request, db)
    return ApiResponse.ok(data, "Mã đăng ký đã được tạo")


@router.delete("/{enrollment_id}", response_model=ApiResponse[None])
async def delete_enrollment(
    enrollment_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Vô hiệu hóa mã đăng ký (kiểm tra quyền Khu vực)."""
    result = await db.execute(select(EnrollmentProfile).where(EnrollmentProfile.id == enrollment_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundException("Enrollment profile không tồn tại")
    verify_campus_access(current_user, profile.campus_id)
    await DeviceService.delete_enrollment(enrollment_id, db)
    return ApiResponse.ok(message="Mã đăng ký đã bị vô hiệu hóa")
