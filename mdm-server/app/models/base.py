"""
Base model mixin — Tương đương BaseEntity.java.

Tất cả model có UUID primary key và created_at/updated_at
kế thừa các cột từ class này thông qua mixin pattern.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID


class TimestampMixin:
    """Mixin cung cấp created_at và updated_at cho tất cả model."""

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class UUIDPrimaryKeyMixin:
    """Mixin cung cấp UUID primary key tự sinh."""

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )


class BaseModelMixin(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Kết hợp UUID PK + Timestamps.
    Tương đương BaseEntity.java (id + created_at + updated_at).
    """
    pass
