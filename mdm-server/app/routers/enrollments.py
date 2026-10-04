"""
Enrollments Router — BUG-2 FIX.

Frontend gọi:
  GET  /api/enrollments
  POST /api/enrollments
  DELETE /api/enrollments/{id}

Tách ra thành router riêng với prefix /enrollments.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.core.response import ApiResponse
from app.db.session import get_db
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
    """Lấy danh sách mã đăng ký đang hoạt động."""
    data = await DeviceService.get_enrollments(campus_id, db)
    return ApiResponse.ok(data)


@router.post("", response_model=ApiResponse[EnrollmentDto])
async def create_enrollment(
    request: CreateEnrollmentRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Tạo mã đăng ký QR cho thiết bị."""
    data = await DeviceService.create_enrollment(request, db)
    return ApiResponse.ok(data, "Mã đăng ký đã được tạo")


@router.delete("/{enrollment_id}", response_model=ApiResponse[None])
async def delete_enrollment(
    enrollment_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Vô hiệu hóa mã đăng ký."""
    await DeviceService.delete_enrollment(enrollment_id, db)
    return ApiResponse.ok(message="Mã đăng ký đã bị vô hiệu hóa")
