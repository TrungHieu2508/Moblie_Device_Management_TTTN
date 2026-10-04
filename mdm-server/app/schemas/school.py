"""
School Schemas — Campus, School, Classroom, ClassSession DTOs.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from app.schemas.base import CamelModel


# ── Campus ────────────────────────────────────────────────────

class CampusCreateRequest(CamelModel):
    name: str
    code: str
    address: Optional[str] = None


class CampusUpdateRequest(CamelModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None


class CampusDto(CamelModel):
    id: UUID
    name: str
    code: str
    address: Optional[str] = None
    is_active: bool = True


# ── School ─────────────────────────────────────────────────────

class SchoolCreateRequest(CamelModel):
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    campus_id: Optional[UUID] = None


class SchoolUpdateRequest(CamelModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    campus_id: Optional[UUID] = None


class SchoolDto(CamelModel):
    id: UUID
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    campus_id: Optional[UUID] = None
    campus_name: Optional[str] = None


# ── Classroom ─────────────────────────────────────────────────

class ClassroomCreateRequest(CamelModel):
    name: str
    code: str
    capacity: Optional[int] = None


class ClassroomUpdateRequest(CamelModel):
    name: Optional[str] = None
    code: Optional[str] = None
    capacity: Optional[int] = None


class ClassroomDto(CamelModel):
    id: UUID
    name: str
    code: str
    capacity: Optional[int] = None
    is_active: bool = True
    school_id: Optional[UUID] = None
    school_name: Optional[str] = None


# ── ClassSession ──────────────────────────────────────────────

class ClassSessionCreateRequest(CamelModel):
    classroom_id: UUID
    teacher_id: UUID
    scheduled_start_time: Optional[datetime] = None
    scheduled_end_time: Optional[datetime] = None


class ClassSessionDto(CamelModel):
    id: UUID
    classroom_id: UUID
    classroom_name: Optional[str] = None
    teacher_id: UUID
    teacher_name: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    scheduled_start_time: Optional[datetime] = None
    scheduled_end_time: Optional[datetime] = None
