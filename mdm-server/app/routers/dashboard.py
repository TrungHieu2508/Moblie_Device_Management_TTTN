"""
Dashboard Router — Tương đương DashboardController.java.

BUG-3 FIX: Frontend gọi /dashboard/summary, thêm endpoint phù hợp.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.alert import Alert
from app.models.device import Device
from app.models.enums import AlertStatus, DeviceStatus
from app.models.user import User
from app.ws.connection_manager import manager

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


async def _build_summary(db: AsyncSession) -> dict:
    """Xây dựng dữ liệu dashboard summary."""
    # Tổng số thiết bị
    total_devices = (await db.execute(select(func.count()).select_from(Device))).scalar()

    # Đếm theo status trong DB
    status_counts = {}
    for status in DeviceStatus:
        count = (
            await db.execute(
                select(func.count()).select_from(Device).where(Device.status == status.value)
            )
        ).scalar()
        status_counts[status.value] = count

    # Số device thực sự đang kết nối WS (real-time, chính xác hơn DB)
    realtime_online = len(manager.get_online_device_ids())

    # Alert stats
    active_alerts = (
        await db.execute(
            select(func.count()).select_from(Alert).where(
                Alert.status.in_([AlertStatus.NEW.value, AlertStatus.PROCESSING.value])
            )
        )
    ).scalar()

    # Tính safety index (0-100): tỷ lệ thiết bị không có warning/critical
    safe_devices = total_devices - status_counts.get("WARNING", 0) - status_counts.get("CRITICAL", 0)
    safety_index = round((safe_devices / max(total_devices, 1)) * 100)

    return {
        "totalDevices": total_devices,
        "onlineDevices": realtime_online,
        "offlineDevices": status_counts.get("OFFLINE", 0),
        "warningDevices": status_counts.get("WARNING", 0),
        "criticalDevices": status_counts.get("CRITICAL", 0),
        "unresolvedAlerts": active_alerts,
        "safetyIndex": safety_index,
        "devicesByStatus": status_counts,
        "connectionStats": manager.get_connection_stats(),
    }


@router.get("/summary", response_model=ApiResponse[dict])
async def get_dashboard_summary(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Dashboard Summary — Frontend gọi endpoint này.
    Trả về dữ liệu khớp với DashboardSummaryDto trong frontend.
    """
    data = await _build_summary(db)
    return ApiResponse.ok(data)


@router.get("/stats", response_model=ApiResponse[dict])
async def get_dashboard_stats(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Dashboard Stats — Alias cũ, giữ tương thích.
    """
    data = await _build_summary(db)
    return ApiResponse.ok(data)
