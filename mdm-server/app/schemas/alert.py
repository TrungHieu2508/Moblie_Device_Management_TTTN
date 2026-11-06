"""
Alert Schemas — Tương đương DTOs trong domain/alert/dto/.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from app.models.enums import AlertSeverity, AlertStatus
from app.schemas.base import CamelModel


class DeviceBasicInfo(CamelModel):
    id: UUID
    device_id: str
    device_name: Optional[str] = None


class RuleBasicInfo(CamelModel):
    id: UUID
    name: str


class AlertDto(CamelModel):
    """Tương đương AlertDto.java"""
    id: UUID
    alert_code: str
    title: str
    description: Optional[str] = None
    severity: AlertSeverity
    status: AlertStatus
    device: Optional[DeviceBasicInfo] = None
    rule: Optional[RuleBasicInfo] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None


class AlertUpdateRequest(CamelModel):
    """Cập nhật trạng thái alert (PROCESSING, RESOLVED, DISMISSED)."""
    status: AlertStatus
    resolution_note: Optional[str] = None


class PagedAlertResponse(CamelModel):
    items: list[AlertDto]
    content: list[AlertDto] = []
    total: int
    total_elements: int = 0
    page: int
    size: int
