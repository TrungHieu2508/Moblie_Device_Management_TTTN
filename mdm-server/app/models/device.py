"""
Device domain models — Device, EnrollmentProfile.

Tương đương:
  - Device.java
  - EnrollmentProfile.java
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import BaseModelMixin
from app.models.enums import DeviceStatus


class Device(BaseModelMixin, Base):
    __tablename__ = "devices"

    device_id = Column(String(100), unique=True, nullable=False)
    device_name = Column(String(255), nullable=True)
    serial_number = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    android_version = Column(String(50), nullable=True)
    agent_version = Column(String(50), nullable=True)

    # Trạng thái — SOURCE OF TRUTH: DB (Phương án B)
    # Không dùng Redis TTL nữa. WebSocket connect/disconnect cập nhật trực tiếp vào đây.
    status = Column(String(20), default=DeviceStatus.PENDING.value, nullable=False)

    registration_token = Column(Text, nullable=True)
    last_heartbeat_at = Column(DateTime(timezone=True), nullable=True)
    registered_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )
    notes = Column(Text, nullable=True)

    # FK đến School, Campus, Classroom
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    campus_id = Column(UUID(as_uuid=True), ForeignKey("campuses.id", ondelete="SET NULL"), nullable=True)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True)

    # Relationships (lazy="selectin" để load kèm khi query device)
    school = relationship("School", lazy="selectin")
    campus = relationship("Campus", lazy="selectin")
    classroom = relationship("Classroom", lazy="selectin")


class EnrollmentProfile(BaseModelMixin, Base):
    __tablename__ = "enrollment_profiles"

    code = Column(String(20), unique=True, nullable=False)

    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    campus_id = Column(UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=False)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_uses = Column(Integer, default=0, nullable=False)
    current_uses = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    school = relationship("School", lazy="selectin")
    campus = relationship("Campus", lazy="selectin")
    classroom = relationship("Classroom", lazy="selectin")
