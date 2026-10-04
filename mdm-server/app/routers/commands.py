"""
Commands Router — Tương đương CommandAdminController.java.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_admin
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.user import User
from app.schemas.command import CommandCreateRequest, CommandDto, PagedCommandResponse
from app.services.command_service import CommandService

router = APIRouter(prefix="/commands", tags=["Commands"])


@router.post("/devices/{device_uuid}", response_model=ApiResponse[CommandDto])
async def create_command(
    device_uuid: UUID,
    request: CommandCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Tạo và gửi lệnh đến thiết bị.
    Phương án B: Gửi trực tiếp qua WebSocket nếu device ONLINE.
    """
    data = await CommandService.create_command(device_uuid, request, current_user, db)
    return ApiResponse.ok(data, "Lệnh đã được tạo và gửi")


@router.get("/devices/{device_uuid}/history", response_model=ApiResponse[PagedCommandResponse])
async def get_command_history(
    device_uuid: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lịch sử lệnh của một thiết bị."""
    data = await CommandService.get_command_history(device_uuid, page, size, db)
    return ApiResponse.ok(data)
