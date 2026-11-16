"""
DeviceMetricsSnapshot model — Lưu lịch sử metrics theo từng mốc thời gian.

Chiến lược: In-memory + Lưu DB định kỳ (Phương án B mở rộng).
  - In-memory  : Dữ liệu REAL-TIME nhất, cập nhật mỗi 30s từ agent
  - DB snapshot: Lưu cứ mỗi 10 lần nhận metrics (~5 phút/lần)
                 Phục vụ vẽ biểu đồ lịch sử RAM/CPU/Battery
"""

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class DeviceMetricsSnapshot(Base):
    """
    Bảng device_metrics_snapshots:
    Mỗi hàng là một bản ghi tại thời điểm snapshot (cứ ~5 phút/lần).
    Dùng BigInteger PK (autoincrement) vì bảng có thể có hàng triệu hàng.
    """
    __tablename__ = "device_metrics_snapshots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # FK đến bảng devices (UUID)
    device_id = Column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,          # Index để query nhanh theo device
    )

    # ── Metrics fields ─────────────────────────────────────────
    ram_usage_mb = Column(Integer, nullable=True)          # RAM đang dùng (MB)
    ram_total_mb = Column(Integer, nullable=True)          # RAM tổng (MB)
    cpu_usage_percent = Column(Float, nullable=True)       # CPU % (0.0 – 100.0)
    battery_level = Column(Integer, nullable=True)         # Pin % (0 – 100)
    battery_charging = Column(String(20), nullable=True)   # "CHARGING" | "DISCHARGING" | "FULL"
    storage_used_mb = Column(Integer, nullable=True)       # Storage đang dùng (MB)
    storage_total_mb = Column(Integer, nullable=True)      # Storage tổng (MB)
    wifi_ssid = Column(String(100), nullable=True)         # SSID WiFi đang kết nối
    wifi_signal_strength = Column(Integer, nullable=True)  # Cường độ tín hiệu WiFi (dBm)

    # Thời điểm snapshot được ghi nhận (server-side)
    recorded_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,          # Index để query nhanh theo thời gian
    )

    # Relationship (lazy="noload" để không tự join khi không cần)
    device = relationship("Device", lazy="noload")
