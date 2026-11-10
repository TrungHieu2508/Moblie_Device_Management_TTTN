"""
Alerts Router — Tương đương AlertController.java.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.enums import AlertStatus
from app.models.user import User
from app.schemas.alert import AlertDto, AlertUpdateRequest, PagedAlertResponse
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=ApiResponse[PagedAlertResponse])
async def get_alerts(
    campus_id: Optional[UUID] = Query(None, alias="campusId"),
    status: Optional[AlertStatus] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách cảnh báo, lọc theo campus và trạng thái."""
    data = await AlertService.get_alerts(
        campus_id=campus_id,
        status=status,
        page=page,
        size=size,
        db=db,
        severity=severity,
        search=search,
    )
    return ApiResponse.ok(data)


@router.put("/resolve-all", response_model=ApiResponse[dict])
async def resolve_all_alerts(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Đánh dấu tất cả cảnh báo đang mở là RESOLVED."""
    resolved_count = await AlertService.resolve_all_alerts(current_user, db)
    return ApiResponse.ok({"resolvedCount": resolved_count}, f"Đã xử lý {resolved_count} cảnh báo")


@router.patch("/{alert_id}/status", response_model=ApiResponse[AlertDto])
async def update_alert_status(
    alert_id: UUID,
    request: AlertUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật trạng thái cảnh báo (PROCESSING, RESOLVED, DISMISSED)."""
    data = await AlertService.update_alert_status(alert_id, request, current_user, db)
    return ApiResponse.ok(data, "Cảnh báo đã được cập nhật")
