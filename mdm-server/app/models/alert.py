"""
Alert model — Tương đương Alert.java.
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, BigInteger
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import BaseModelMixin
from app.models.enums import AlertSeverity, AlertStatus


class Alert(BaseModelMixin, Base):
    __tablename__ = "alerts"

    alert_code = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Enum lưu string: INFO, WARNING, CRITICAL
    severity = Column(String(20), nullable=False, default=AlertSeverity.WARNING)
    # Enum lưu string: NEW, PROCESSING, RESOLVED, DISMISSED
    status = Column(String(20), nullable=False, default=AlertStatus.NEW)

    # JSONB: dữ liệu event đi kèm
    event_data = Column(JSONB, nullable=True)

    resolution_note = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # FK
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    campus_id = Column(UUID(as_uuid=True), ForeignKey("campuses.id", ondelete="SET NULL"), nullable=True)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("rules.id", ondelete="SET NULL"), nullable=True)
    event_id = Column(BigInteger, ForeignKey("device_events.id", ondelete="SET NULL"), nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    device = relationship("Device", lazy="selectin")
    school = relationship("School", lazy="selectin")
    campus = relationship("Campus", lazy="selectin")
    classroom = relationship("Classroom", lazy="selectin")
    rule = relationship("Rule", lazy="selectin")
    resolved_by = relationship("User", lazy="selectin")
