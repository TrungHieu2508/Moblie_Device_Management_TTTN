"""
Command model — Tương đương DeviceCommand.java.
"""

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import BaseModelMixin
from app.models.enums import CommandStatus, CommandType


class DeviceCommand(BaseModelMixin, Base):
    """
    Lưu lịch sử và trạng thái của tất cả remote commands.

    Phương án B: Khi device ONLINE → lệnh được đẩy trực tiếp qua WebSocket,
    status chuyển PENDING → SENT ngay lập tức.
    Khi device OFFLINE → giữ status PENDING trong DB,
    server tự gửi lại khi device reconnect WebSocket.
    """
    __tablename__ = "device_commands"

    # Enum lưu string: LOCK_SCREEN, RING_ALARM, v.v.
    command_type = Column(String(50), nullable=False)

    # JSONB: tham số kèm theo lệnh (vd: {"message": "Chú ý!", "url": "..."})
    payload = Column(JSONB, nullable=True)

    # Enum lưu string: PENDING, SENT, ACKNOWLEDGED, EXECUTED, FAILED, EXPIRED
    status = Column(String(20), nullable=False, default=CommandStatus.PENDING)

    error_message = Column(String(1000), nullable=True)

    sent_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)

    # FK
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    device = relationship("Device", lazy="selectin")
    created_by = relationship("User", lazy="selectin")
