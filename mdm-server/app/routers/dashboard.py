"""
Dashboard Router — Tương đương DashboardController.java.

BUG-3 FIX: Frontend gọi /dashboard/summary, thêm endpoint phù hợp.
"""

from datetime import datetime, timedelta, timezone

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

_WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]


async def _build_summary(db: AsyncSession) -> dict:
    """Xây dựng dữ liệu dashboard summary."""
    # Tổng số thiết bị
    total_devices = (await db.execute(select(func.count()).select_from(Device))).scalar() or 0

    # Đếm theo status trong DB
    status_counts = {}
    for status in DeviceStatus:
        count = (
            await db.execute(
                select(func.count()).select_from(Device).where(Device.status == status.value)
            )
        ).scalar() or 0
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
    ).scalar() or 0

    # Tính safety index (0-100): tỷ lệ thiết bị không có warning/critical
    safe_devices = max(total_devices - status_counts.get("WARNING", 0) - status_counts.get("CRITICAL", 0), 0)
    safety_index = round((safe_devices / max(total_devices, 1)) * 100)

    # Thống kê vi phạm 7 ngày gần nhất từ bảng alerts
    now = datetime.now(timezone.utc)
    start_7d = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    recent_alerts = (
        await db.execute(
            select(Alert.created_at, Alert.alert_code).where(Alert.created_at >= start_7d)
        )
    ).all()

    daily_map: dict[str, dict[str, int]] = {}
    ordered_days: list[tuple[str, str]] = []
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).date()
        key = d.isoformat()
        label = _WEEKDAY_LABELS[d.weekday()]
        daily_map[key] = {"locked": 0, "gaming": 0}
        ordered_days.append((key, label))

    for created_at, alert_code in recent_alerts:
        if not created_at:
            continue
        d_key = created_at.astimezone(timezone.utc).date().isoformat()
        if d_key in daily_map:
            code = (alert_code or "").upper()
            if "APP" in code or "BLACKLIST" in code or "WHITELIST" in code:
                daily_map[d_key]["gaming"] += 1
            else:
                daily_map[d_key]["locked"] += 1

    violation_data = [
        {"name": label, "locked": daily_map[key]["locked"], "gaming": daily_map[key]["gaming"]}
        for key, label in ordered_days
    ]

    return {
        "totalDevices": total_devices,
        "onlineDevices": realtime_online,
        "offlineDevices": status_counts.get("OFFLINE", 0),
        "warningDevices": status_counts.get("WARNING", 0),
        "criticalDevices": status_counts.get("CRITICAL", 0),
        "unresolvedAlerts": active_alerts,
        "safetyIndex": safety_index,
        "devicesByStatus": status_counts,
        "violationData": violation_data,
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
