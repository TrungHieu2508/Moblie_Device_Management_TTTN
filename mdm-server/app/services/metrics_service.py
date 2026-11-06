"""
MetricsPersistenceService — Dịch vụ lưu metrics định kỳ vào PostgreSQL.

Chiến lược: In-memory + DB Snapshot.
  - In-memory  (ConnectionManager.device_metrics): Cập nhật NGAY sau mỗi lần nhận,
                phục vụ Dashboard real-time qua WebSocket broadcast.
  - DB Snapshot (bảng device_metrics_snapshots)  : Lưu cứ METRICS_SAVE_EVERY lần nhận,
                phục vụ query lịch sử/biểu đồ.

METRICS_SAVE_EVERY = 10 → với agent gửi 30s/lần thì cứ 5 phút lưu 1 snapshot.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.device import Device
from app.models.metrics import DeviceMetricsSnapshot

logger = logging.getLogger(__name__)

# ── Cấu hình ─────────────────────────────────────────────────
# Cứ mỗi N lần nhận metrics từ agent thì mới lưu 1 snapshot vào DB.
# N=10 + interval 30s → snapshot mỗi ~5 phút.
# Điều chỉnh con số này tuỳ theo nhu cầu granularity của biểu đồ.
METRICS_SAVE_EVERY: int = 10


class MetricsPersistenceService:
    """
    Service quản lý việc lưu metrics vào DB theo định kỳ.
    
    Không tự tạo session riêng mà nhận session từ bên ngoài (agent_ws.py)
    hoặc tự tạo thông qua async_session_factory khi cần.
    """

    # ── Counter (in-memory, per device) ──────────────────────
    # Đếm số lần đã nhận metrics của mỗi device.
    # Key: device_id (string, dạng "abc-xyz-...-001")
    # Value: số nguyên đếm
    _counters: dict[str, int] = {}

    @classmethod
    def should_save(cls, device_id: str) -> bool:
        """
        Tăng counter của device lên 1 và kiểm tra có nên lưu DB không.
        
        Returns:
            True  nếu đã đến lần thứ N (modulo METRICS_SAVE_EVERY)
            False nếu chưa đến lượt
        """
        current = cls._counters.get(device_id, 0) + 1
        cls._counters[device_id] = current
        return current == 1 or (current % METRICS_SAVE_EVERY) == 0

    @classmethod
    def reset_counter(cls, device_id: str) -> None:
        """Xoá counter khi device disconnect (dọn dẹp bộ nhớ)."""
        cls._counters.pop(device_id, None)

    @classmethod
    async def _get_device_uuid(cls, device_id_str: str) -> Optional[UUID]:
        """
        Lấy UUID (primary key) của device từ device_id string.
        
        Bảng devices dùng 2 loại ID:
          - id (UUID)       : primary key trong DB
          - device_id (str) : ID của thiết bị Android (ví dụ: "IMEI-abc123")
        
        Snapshot cần FK là UUID, không phải string device_id.
        """
        async with async_session_factory() as db:
            result = await db.execute(
                select(Device.id).where(Device.device_id == device_id_str)
            )
            return result.scalar_one_or_none()

    @classmethod
    async def save_snapshot(cls, device_id_str: str, metrics: dict) -> None:
        """
        Lưu một metrics snapshot vào bảng device_metrics_snapshots.
        
        Args:
            device_id_str: device_id của Android agent (string, không phải UUID)
            metrics: dict metrics nhận từ agent qua WebSocket
                     Ví dụ: {
                         "ramUsageMb": 1024, "ramTotalMb": 3072,
                         "cpuUsagePercent": 45.2,
                         "batteryLevel": 78, "batteryCharging": "DISCHARGING",
                         "storageUsedMb": 8192, "storageTotalMb": 32768,
                         "wifiSsid": "SchoolNet", "wifiSignalStrength": -65
                     }
        """
        try:
            # 1. Lấy UUID của device
            device_uuid = await cls._get_device_uuid(device_id_str)
            if not device_uuid:
                logger.warning(
                    "MetricsPersistence: Không tìm thấy device với device_id='%s', bỏ qua snapshot.",
                    device_id_str,
                )
                return

            # 2. Map fields từ metrics dict sang model
            #    Agent gửi lên camelCase (ramUsedMb, cpuUsagePct, storageUsedGb, wifiSignal, batteryCharging bool)
            ram_usage_mb = (
                metrics.get("ramUsedMb")
                if metrics.get("ramUsedMb") is not None
                else metrics.get("ramUsageMb") or metrics.get("ram_usage_mb")
            )
            ram_total_mb = (
                metrics.get("ramTotalMb")
                if metrics.get("ramTotalMb") is not None
                else metrics.get("ram_total_mb")
            )
            cpu_usage_percent = (
                metrics.get("cpuUsagePct")
                if metrics.get("cpuUsagePct") is not None
                else metrics.get("cpuUsagePercent") or metrics.get("cpu_usage_percent")
            )
            battery_level = (
                metrics.get("batteryLevel")
                if metrics.get("batteryLevel") is not None
                else metrics.get("battery_level")
            )
            raw_charging = (
                metrics.get("batteryCharging")
                if metrics.get("batteryCharging") is not None
                else metrics.get("battery_charging")
            )
            if isinstance(raw_charging, bool):
                battery_charging = "CHARGING" if raw_charging else "DISCHARGING"
            elif raw_charging is not None:
                battery_charging = str(raw_charging)
            else:
                battery_charging = None

            storage_used_mb = metrics.get("storageUsedMb") or metrics.get("storage_used_mb")
            if storage_used_mb is None and metrics.get("storageUsedGb") is not None:
                storage_used_mb = int(round(float(metrics["storageUsedGb"]) * 1024))

            storage_total_mb = metrics.get("storageTotalMb") or metrics.get("storage_total_mb")
            if storage_total_mb is None and metrics.get("storageTotalGb") is not None:
                storage_total_mb = int(round(float(metrics["storageTotalGb"]) * 1024))

            wifi_ssid = metrics.get("wifiSsid") or metrics.get("wifi_ssid")
            wifi_signal_strength = (
                metrics.get("wifiSignal")
                if metrics.get("wifiSignal") is not None
                else metrics.get("wifiSignalStrength") or metrics.get("wifi_signal_strength")
            )

            snapshot = DeviceMetricsSnapshot(
                device_id=device_uuid,
                ram_usage_mb=int(ram_usage_mb) if ram_usage_mb is not None else None,
                ram_total_mb=int(ram_total_mb) if ram_total_mb is not None else None,
                cpu_usage_percent=float(cpu_usage_percent) if cpu_usage_percent is not None else None,
                battery_level=int(battery_level) if battery_level is not None else None,
                battery_charging=battery_charging,
                storage_used_mb=int(storage_used_mb) if storage_used_mb is not None else None,
                storage_total_mb=int(storage_total_mb) if storage_total_mb is not None else None,
                wifi_ssid=wifi_ssid,
                wifi_signal_strength=int(wifi_signal_strength) if wifi_signal_strength is not None else None,
                recorded_at=datetime.now(timezone.utc),
            )

            # 3. Lưu vào DB
            async with async_session_factory() as db:
                db.add(snapshot)
                await db.commit()

            logger.debug(
                "MetricsPersistence: Đã lưu snapshot cho device='%s' (counter=%d)",
                device_id_str,
                cls._counters.get(device_id_str, 0),
            )

        except Exception as e:
            logger.error(
                "MetricsPersistence: Lỗi khi lưu snapshot cho device='%s': %s",
                device_id_str,
                e,
            )
            # Không raise exception để không làm ảnh hưởng luồng WebSocket chính


# ── Singleton Instance ────────────────────────────────────────
metrics_persistence = MetricsPersistenceService()
