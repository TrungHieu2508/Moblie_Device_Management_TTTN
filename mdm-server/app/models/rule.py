"""
Rule model — Tương đương Rule.java.
"""

from sqlalchemy import Boolean, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import BaseModelMixin


class Rule(BaseModelMixin, Base):
    __tablename__ = "rules"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Enum lưu dạng string: APP_WHITELIST, APP_BLACKLIST, RAM_THRESHOLD, v.v.
    rule_type = Column(String(50), nullable=False)

    # JSONB: cấu hình chi tiết của rule (danh sách app, ngưỡng %, v.v.)
    rule_data = Column(JSONB, nullable=True)

    # severity: INFO, WARNING, CRITICAL
    severity = Column(String(20), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    school = relationship("School", lazy="selectin")
    created_by = relationship("User", lazy="selectin")
