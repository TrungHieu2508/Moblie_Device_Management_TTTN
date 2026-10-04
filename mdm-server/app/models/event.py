"""
DeviceEvent model — Tương đương DeviceEvent.java.
"""

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class DeviceEvent(Base):
    """
    Bảng device_events dùng BIGSERIAL (id là BigInteger, không phải UUID).
    Không kế thừa BaseModelMixin vì không có updated_at.
    """
    __tablename__ = "device_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)

    # Enum lưu string: APP_OPENED, BLACKLIST_APP_DETECTED, RAM_HIGH, v.v.
    event_type = Column(String(50), nullable=False)

    # JSONB: dữ liệu kèm theo sự kiện
    event_data = Column(JSONB, nullable=True)

    occurred_at = Column(DateTime(timezone=True), nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    device = relationship("Device", lazy="selectin")
