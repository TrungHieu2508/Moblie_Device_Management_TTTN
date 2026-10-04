"""
School domain models — Campus, School, Classroom, ClassSession.

Tương đương:
  - Campus.java
  - School.java
  - Classroom.java
  - ClassSession.java
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import BaseModelMixin


class Campus(BaseModelMixin, Base):
    __tablename__ = "campuses"

    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    schools = relationship("School", back_populates="campus", lazy="selectin")


class School(BaseModelMixin, Base):
    __tablename__ = "schools"

    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    campus_id = Column(UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=True)

    # Relationships
    campus = relationship("Campus", back_populates="schools", lazy="selectin")
    classrooms = relationship("Classroom", back_populates="school", lazy="selectin")


class Classroom(BaseModelMixin, Base):
    __tablename__ = "classrooms"

    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    capacity = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)

    # Relationships
    school = relationship("School", back_populates="classrooms", lazy="selectin")


class ClassSession(BaseModelMixin, Base):
    __tablename__ = "class_sessions"

    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, ENDED
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_start_time = Column(DateTime(timezone=True), nullable=True)
    scheduled_end_time = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    classroom = relationship("Classroom", lazy="selectin")
    teacher = relationship("User", lazy="selectin")
