"""
Models package — Import tất cả models để SQLAlchemy nhận diện.

File này PHẢI import tất cả models trước khi Alembic hoặc
SQLAlchemy tạo bảng, nếu không sẽ bị thiếu bảng.
"""

from app.models.base import BaseModelMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    AlertSeverity,
    AlertStatus,
    CommandStatus,
    CommandType,
    DeviceStatus,
    EventType,
    RuleType,
    UserRole,
)
from app.models.school import Campus, ClassSession, Classroom, School
from app.models.user import RefreshToken, User
from app.models.device import Device, EnrollmentProfile
from app.models.rule import Rule
from app.models.event import DeviceEvent
from app.models.alert import Alert
from app.models.command import DeviceCommand
from app.models.audit import AuditLog
from app.models.metrics import DeviceMetricsSnapshot

__all__ = [
    # Mixins
    "BaseModelMixin",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    # Enums
    "UserRole",
    "DeviceStatus",
    "CommandType",
    "CommandStatus",
    "EventType",
    "RuleType",
    "AlertSeverity",
    "AlertStatus",
    # Models
    "Campus",
    "School",
    "Classroom",
    "ClassSession",
    "User",
    "RefreshToken",
    "Device",
    "EnrollmentProfile",
    "Rule",
    "DeviceEvent",
    "Alert",
    "DeviceCommand",
    "AuditLog",
    "DeviceMetricsSnapshot",
]
