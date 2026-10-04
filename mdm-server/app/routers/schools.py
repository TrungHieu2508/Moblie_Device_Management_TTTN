"""
Schools Router — Tương đương SchoolController + CampusController + ClassroomController + ClassSessionController.

BUG-7 FIX: Thêm PUT endpoints, nested route /schools/{schoolId}/classrooms
BUG-6 FIX: Thêm đầy đủ ClassSession endpoints: start, end, active, schedule, scheduled, history
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin, require_any_staff
from app.core.exceptions import NotFoundException
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.school import Campus, ClassSession, Classroom, School
from app.models.user import User
from app.schemas.school import (
    CampusCreateRequest,
    CampusDto,
    CampusUpdateRequest,
    ClassroomCreateRequest,
    ClassroomDto,
    ClassroomUpdateRequest,
    ClassSessionCreateRequest,
    ClassSessionDto,
    SchoolCreateRequest,
    SchoolDto,
    SchoolUpdateRequest,
)

router = APIRouter(tags=["Schools"])


# ═════════════════════════════════════════════════════════════════
# CAMPUS
# ═════════════════════════════════════════════════════════════════

@router.get("/campuses", response_model=ApiResponse[List[CampusDto]])
async def get_campuses(
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Campus).where(Campus.is_active == True))
    items = result.scalars().all()
    return ApiResponse.ok([CampusDto.model_validate(c) for c in items])


@router.post("/campuses", response_model=ApiResponse[CampusDto])
async def create_campus(
    request: CampusCreateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    campus = Campus(
        id=uuid.uuid4(),
        name=request.name,
        code=request.code.upper(),
        address=request.address,
    )
    db.add(campus)
    await db.commit()
    await db.refresh(campus)
    return ApiResponse.ok(CampusDto.model_validate(campus), "Cơ sở đã được tạo")


@router.put("/campuses/{campus_id}", response_model=ApiResponse[CampusDto])
async def update_campus(
    campus_id: UUID,
    request: CampusUpdateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Campus).where(Campus.id == campus_id))
    campus = result.scalar_one_or_none()
    if not campus:
        raise NotFoundException("Cơ sở không tồn tại")

    if request.name is not None:
        campus.name = request.name
    if request.code is not None:
        campus.code = request.code.upper()
    if request.address is not None:
        campus.address = request.address

    await db.commit()
    await db.refresh(campus)
    return ApiResponse.ok(CampusDto.model_validate(campus), "Cập nhật cơ sở thành công")


@router.delete("/campuses/{campus_id}", response_model=ApiResponse[None])
async def delete_campus(
    campus_id: UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Campus).where(Campus.id == campus_id))
    campus = result.scalar_one_or_none()
    if not campus:
        raise NotFoundException("Cơ sở không tồn tại")
    campus.is_active = False
    await db.commit()
    return ApiResponse.ok(message="Cơ sở đã bị xóa")


# ═════════════════════════════════════════════════════════════════
# SCHOOL
# ═════════════════════════════════════════════════════════════════

@router.get("/schools", response_model=ApiResponse[List[SchoolDto]])
async def get_schools(
    campus_id: Optional[UUID] = Query(None, alias="campusId"),
    page: int = Query(0, ge=0),
    size: int = Query(100, ge=1, le=500),
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    query = select(School).where(School.is_active == True)
    if campus_id:
        query = query.where(School.campus_id == campus_id)
    items = (await db.execute(query.offset(page * size).limit(size))).scalars().all()

    dtos = []
    for s in items:
        dtos.append(SchoolDto(
            id=s.id,
            name=s.name,
            code=s.code,
            address=s.address,
            phone=s.phone,
            email=s.email,
            is_active=s.is_active,
            campus_id=s.campus_id,
            campus_name=s.campus.name if s.campus else None,
        ))
    return ApiResponse.ok(dtos)


@router.post("/schools", response_model=ApiResponse[SchoolDto])
async def create_school(
    request: SchoolCreateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school = School(
        id=uuid.uuid4(),
        name=request.name,
        code=request.code.upper(),
        address=request.address,
        phone=request.phone,
        email=request.email,
        campus_id=request.campus_id,
    )
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return ApiResponse.ok(SchoolDto(
        id=school.id, name=school.name, code=school.code,
        address=school.address, phone=school.phone, email=school.email,
        is_active=school.is_active, campus_id=school.campus_id,
        campus_name=None,
    ), "Trường đã được tạo")


@router.put("/schools/{school_id}", response_model=ApiResponse[SchoolDto])
async def update_school(
    school_id: UUID,
    request: SchoolUpdateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise NotFoundException("Trường không tồn tại")

    if request.name is not None:
        school.name = request.name
    if request.code is not None:
        school.code = request.code.upper()
    if request.address is not None:
        school.address = request.address
    if request.phone is not None:
        school.phone = request.phone
    if request.email is not None:
        school.email = request.email
    if request.campus_id is not None:
        school.campus_id = request.campus_id

    await db.commit()
    await db.refresh(school)
    return ApiResponse.ok(SchoolDto(
        id=school.id, name=school.name, code=school.code,
        address=school.address, phone=school.phone, email=school.email,
        is_active=school.is_active, campus_id=school.campus_id,
        campus_name=None,
    ), "Cập nhật trường thành công")


@router.delete("/schools/{school_id}", response_model=ApiResponse[None])
async def delete_school(
    school_id: UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise NotFoundException("Trường không tồn tại")
    school.is_active = False
    await db.commit()
    return ApiResponse.ok(message="Trường đã bị xóa")


# ═════════════════════════════════════════════════════════════════
# CLASSROOM
# ═════════════════════════════════════════════════════════════════

def _classroom_to_dto(c: Classroom) -> ClassroomDto:
    return ClassroomDto(
        id=c.id,
        name=c.name,
        code=c.code,
        capacity=c.capacity,
        is_active=c.is_active,
        school_id=c.school_id,
        school_name=c.school.name if c.school else None,
    )


@router.get("/classrooms", response_model=ApiResponse[List[ClassroomDto]])
async def get_classrooms(
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    query = select(Classroom).where(Classroom.is_active == True)
    if school_id:
        query = query.where(Classroom.school_id == school_id)
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([_classroom_to_dto(c) for c in items])


# BUG-7 FIX: Nested route /schools/{schoolId}/classrooms
@router.get("/schools/{school_id}/classrooms", response_model=ApiResponse[List[ClassroomDto]])
async def get_classrooms_by_school(
    school_id: UUID,
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    """Frontend gọi: GET /schools/{schoolId}/classrooms"""
    query = select(Classroom).where(
        Classroom.school_id == school_id,
        Classroom.is_active == True,
    )
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([_classroom_to_dto(c) for c in items])


@router.post("/schools/{school_id}/classrooms", response_model=ApiResponse[ClassroomDto])
async def create_classroom_nested(
    school_id: UUID,
    request: ClassroomCreateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Frontend gọi: POST /schools/{schoolId}/classrooms"""
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise NotFoundException("Trường không tồn tại")

    classroom = Classroom(
        id=uuid.uuid4(),
        name=request.name,
        code=request.code.upper(),
        school_id=school_id,
        capacity=request.capacity,
    )
    db.add(classroom)
    await db.commit()
    await db.refresh(classroom)
    return ApiResponse.ok(_classroom_to_dto(classroom), "Lớp học đã được tạo")


@router.post("/classrooms", response_model=ApiResponse[ClassroomDto])
async def create_classroom(
    request: ClassroomCreateRequest,
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Tạo classroom — flat route."""
    # school_id có thể ở trong request body hoặc query param
    # ClassroomCreateRequest không có school_id field nữa, nên dùng query
    if not school_id:
        raise NotFoundException("Thiếu school_id")

    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise NotFoundException("Trường không tồn tại")

    classroom = Classroom(
        id=uuid.uuid4(),
        name=request.name,
        code=request.code.upper(),
        school_id=school_id,
        capacity=request.capacity,
    )
    db.add(classroom)
    await db.commit()
    await db.refresh(classroom)
    return ApiResponse.ok(_classroom_to_dto(classroom), "Lớp học đã được tạo")


@router.put("/classrooms/{classroom_id}", response_model=ApiResponse[ClassroomDto])
async def update_classroom(
    classroom_id: UUID,
    request: ClassroomUpdateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Frontend gọi: PUT /classrooms/{id}"""
    result = await db.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise NotFoundException("Lớp học không tồn tại")

    if request.name is not None:
        classroom.name = request.name
    if request.code is not None:
        classroom.code = request.code.upper()
    if request.capacity is not None:
        classroom.capacity = request.capacity

    await db.commit()
    await db.refresh(classroom)
    return ApiResponse.ok(_classroom_to_dto(classroom), "Cập nhật lớp học thành công")


@router.delete("/classrooms/{classroom_id}", response_model=ApiResponse[None])
async def delete_classroom(
    classroom_id: UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise NotFoundException("Lớp học không tồn tại")
    classroom.is_active = False
    await db.commit()
    return ApiResponse.ok(message="Lớp học đã bị xóa")


# ═════════════════════════════════════════════════════════════════
# CLASS SESSION — BUG-6 FIX: Complete implementation
# ═════════════════════════════════════════════════════════════════

def _session_to_dto(s: ClassSession) -> ClassSessionDto:
    return ClassSessionDto(
        id=s.id,
        classroom_id=s.classroom_id,
        classroom_name=s.classroom.name if s.classroom else None,
        teacher_id=s.teacher_id,
        teacher_name=s.teacher.full_name if s.teacher else None,
        status=s.status,
        started_at=s.started_at,
        ended_at=s.ended_at,
        scheduled_start_time=s.scheduled_start_time,
        scheduled_end_time=s.scheduled_end_time,
    )


@router.post("/class-sessions/start", response_model=ApiResponse[ClassSessionDto])
async def start_session(
    classroom_id: UUID = Query(..., alias="classroomId"),
    teacher_id: UUID = Query(..., alias="teacherId"),
    current_user: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    """
    Frontend gọi: POST /class-sessions/start?classroomId=...&teacherId=...
    """
    session = ClassSession(
        id=uuid.uuid4(),
        classroom_id=classroom_id,
        teacher_id=teacher_id,
        status="ACTIVE",
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return ApiResponse.ok(_session_to_dto(session), "Buổi học đã bắt đầu")


@router.post("/class-sessions/{session_id}/end", response_model=ApiResponse[ClassSessionDto])
async def end_session(
    session_id: UUID,
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    """Frontend gọi: POST /class-sessions/{sessionId}/end"""
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundException("Buổi học không tồn tại")
    session.status = "ENDED"
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return ApiResponse.ok(_session_to_dto(session), "Buổi học đã kết thúc")


@router.get("/class-sessions/active", response_model=ApiResponse[List[ClassSessionDto]])
async def get_active_sessions(
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    """Frontend gọi: GET /class-sessions/active?schoolId=..."""
    query = select(ClassSession).where(ClassSession.status == "ACTIVE")
    if school_id:
        query = query.join(Classroom).where(Classroom.school_id == school_id)
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([_session_to_dto(s) for s in items])


@router.post("/class-sessions/schedule", response_model=ApiResponse[ClassSessionDto])
async def schedule_session(
    request: ClassSessionCreateRequest,
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    """Frontend gọi: POST /class-sessions/schedule"""
    session = ClassSession(
        id=uuid.uuid4(),
        classroom_id=request.classroom_id,
        teacher_id=request.teacher_id,
        status="SCHEDULED",
        scheduled_start_time=request.scheduled_start_time,
        scheduled_end_time=request.scheduled_end_time,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return ApiResponse.ok(_session_to_dto(session), "Buổi học đã được lên lịch")


@router.get("/class-sessions/scheduled", response_model=ApiResponse[List[ClassSessionDto]])
async def get_scheduled_sessions(
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    """Frontend gọi: GET /class-sessions/scheduled"""
    query = select(ClassSession).where(ClassSession.status == "SCHEDULED")
    if school_id:
        query = query.join(Classroom).where(Classroom.school_id == school_id)
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([_session_to_dto(s) for s in items])


@router.get("/class-sessions/history", response_model=ApiResponse[List[ClassSessionDto]])
async def get_session_history(
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    _: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    """Frontend gọi: GET /class-sessions/history"""
    query = select(ClassSession).where(ClassSession.status == "ENDED")
    if school_id:
        query = query.join(Classroom).where(Classroom.school_id == school_id)
    query = query.order_by(ClassSession.ended_at.desc()).limit(50)
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([_session_to_dto(s) for s in items])


# Legacy — giữ tương thích
@router.post("/class-sessions", response_model=ApiResponse[ClassSessionDto])
async def create_class_session(
    request: ClassSessionCreateRequest,
    current_user: User = Depends(require_any_staff),
    db: AsyncSession = Depends(get_db),
):
    session = ClassSession(
        id=uuid.uuid4(),
        classroom_id=request.classroom_id,
        teacher_id=request.teacher_id,
        status="ACTIVE",
        started_at=datetime.now(timezone.utc),
        scheduled_start_time=request.scheduled_start_time,
        scheduled_end_time=request.scheduled_end_time,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return ApiResponse.ok(_session_to_dto(session), "Buổi học đã bắt đầu")
