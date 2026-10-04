"""
Rule & User Schemas.
"""

from typing import Any, Dict, Optional
from uuid import UUID

from app.models.enums import AlertSeverity, RuleType
from app.schemas.base import CamelModel


class RuleCreateRequest(CamelModel):
    name: str
    description: Optional[str] = None
    rule_type: RuleType
    rule_data: Optional[Dict[str, Any]] = None
    school_id: Optional[UUID] = None
    severity: AlertSeverity


class RuleUpdateRequest(CamelModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rule_data: Optional[Dict[str, Any]] = None
    severity: Optional[AlertSeverity] = None
    is_active: Optional[bool] = None


class RuleDto(CamelModel):
    id: UUID
    name: str
    description: Optional[str] = None
    rule_type: RuleType
    rule_data: Optional[Dict[str, Any]] = None
    school_id: Optional[UUID] = None
    severity: AlertSeverity
    is_active: bool


# ── User ──────────────────────────────────────────────────────

class UserCreateRequest(CamelModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str
    school_id: Optional[UUID] = None
    campus_id: Optional[UUID] = None


class UserDto(CamelModel):
    id: UUID
    username: str
    email: str
    full_name: str
    role: str
    school_id: Optional[UUID] = None
    campus_id: Optional[UUID] = None
    is_active: bool


class UserUpdateRequest(CamelModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    school_id: Optional[UUID] = None
    campus_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class ChangePasswordRequest(CamelModel):
    old_password: str
    new_password: str
