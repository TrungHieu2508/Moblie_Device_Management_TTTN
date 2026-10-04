"""
AuditLog model — Tương đương AuditLog.java.
"""

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class AuditLog(Base):
    """
    Bảng audit_logs dùng BIGSERIAL PK (không phải UUID).
    Không kế thừa BaseModelMixin vì chỉ có created_at, không có updated_at.
    """
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(50), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    user = relationship("User", lazy="selectin")
