"""
User domain models — User, RefreshToken.

Tương đương:
  - User.java
  - RefreshToken.java
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import BaseModelMixin, UUIDPrimaryKeyMixin
from app.models.enums import UserRole


class User(BaseModelMixin, Base):
    __tablename__ = "users"

    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)  # Lưu enum dạng string (TEACHER, IT_ADMIN, SUPER_ADMIN)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=True)
    campus_id = Column(UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=True)

    # Relationships
    school = relationship("School", lazy="selectin")
    campus = relationship("Campus", lazy="selectin")


class RefreshToken(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "refresh_tokens"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(Text, unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", lazy="selectin")
