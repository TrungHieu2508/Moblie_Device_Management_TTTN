"""
Command Schemas — Tương đương DTOs trong domain/command/dto/.
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from app.models.enums import CommandStatus, CommandType
from app.schemas.base import CamelModel


class CommandCreateRequest(CamelModel):
    """Tương đương CommandCreateRequest.java"""
    command_type: CommandType
    payload: Optional[Dict[str, Any]] = None


class CommandAckRequest(CamelModel):
    """
    Agent gửi ACK về sau khi nhận/thực thi lệnh.
    Tương đương CommandAckRequest.java.
    """
    status: CommandStatus  # ACKNOWLEDGED | EXECUTED | FAILED
    error_message: Optional[str] = None


class CommandDto(CamelModel):
    """Tương đương CommandDto.java"""
    id: UUID
    device_id: str
    command_type: CommandType
    payload: Optional[Dict[str, Any]] = None
    status: CommandStatus
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    created_by: Optional[str] = None  # username


class PagedCommandResponse(CamelModel):
    """Paginated list of commands."""
    items: list[CommandDto]
    total: int
    page: int
    size: int
