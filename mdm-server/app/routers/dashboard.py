"""
Dashboard Router — Thống kê Dashboard theo Khu vực (Campus Scope).
  - SUPER_ADMIN: Xem thống kê tổng hợp toàn bộ hệ thống.
  - IT_ADMIN / ADMIN: Chỉ xem thống kê thiết bị và cảnh báo thuộc Khu vực (campus_id) được phân công.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import is_super_admin, require_admin, resolve_scoped_campus_id
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.alert import Alert
from app.models.device import Device
from app.models.enums import AlertStatus, DeviceStatus
from app.models.user import User
from app.ws.connection_manager import manager

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

_WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]


async def _build_summary(db: AsyncSession, current_user: User) -> dict:
    """Xây dựng dữ liệu dashboard summary theo phạm vi Khu vực (Campus) của người dùng."""
    scoped_campus_id = None if is_super_admin(current_user) else resolve_scoped_campus_id(current_user)

    # Tổng số thiết bị trong phạm vi
    total_q = select(func.count()).select_from(Device)
    if scoped_campus_id:
        total_q = total_q.where(Device.campus_id == scoped_campus_id)
    total_devices = (await db.execute(total_q)).scalar() or 0

    # Đếm theo status trong DB
    status_counts = {}
    for status in DeviceStatus:
        st_q = select(func.count()).select_from(Device).where(Device.status == status.value)
        if scoped_campus_id:
            st_q = st_q.where(Device.campus_id == scoped_campus_id)
        count = (await db.execute(st_q)).scalar() or 0
        status_counts[status.value] = count

    # Số device thực sự đang kết nối WS (real-time, lọc theo campus nếu là Admin)
    online_hw_ids = manager.get_online_device_ids()
    if scoped_campus_id:
        if online_hw_ids:
            online_q = (
                select(func.count())
                .select_from(Device)
                .where(
                    Device.campus_id == scoped_campus_id,
                    Device.device_id.in_(online_hw_ids),
                )
            )
            realtime_online = (await db.execute(online_q)).scalar() or 0
        else:
            realtime_online = 0
    else:
        realtime_online = len(online_hw_ids)

    # Alert stats
    active_alerts_q = select(func.count()).select_from(Alert).where(
        Alert.status.in_([AlertStatus.NEW.value, AlertStatus.PROCESSING.value])
    )
    if scoped_campus_id:
        active_alerts_q = active_alerts_q.where(Alert.campus_id == scoped_campus_id)
    active_alerts = (await db.execute(active_alerts_q)).scalar() or 0

    # Tính safety index (0-100): tỷ lệ thiết bị không có warning/critical
    safe_devices = max(total_devices - status_counts.get("WARNING", 0) - status_counts.get("CRITICAL", 0), 0)
    safety_index = round((safe_devices / max(total_devices, 1)) * 100)

    # Thống kê vi phạm 7 ngày gần nhất từ bảng alerts
    now = datetime.now(timezone.utc)
    start_7d = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    recent_alerts_q = select(Alert.created_at, Alert.alert_code).where(Alert.created_at >= start_7d)
    if scoped_campus_id:
        recent_alerts_q = recent_alerts_q.where(Alert.campus_id == scoped_campus_id)
    recent_alerts = (await db.execute(recent_alerts_q)).all()

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
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Dashboard Summary — Trả về dữ liệu thống kê theo Khu vực của người dùng.
    """
    data = await _build_summary(db, current_user)
    return ApiResponse.ok(data)


@router.get("/stats", response_model=ApiResponse[dict])
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Dashboard Stats — Alias cũ, giữ tương thích.
    """
    data = await _build_summary(db, current_user)
    return ApiResponse.ok(data)
