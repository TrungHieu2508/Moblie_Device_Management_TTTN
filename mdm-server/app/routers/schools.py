"""
Schools Router — Quản lý Campus, School và Classroom (Mô hình 2 Roles: SUPER_ADMIN & ADMIN/IT_ADMIN).
Áp dụng phân quyền theo Khu vực (Campus Scope):
  - SUPER_ADMIN: Quản lý toàn bộ Campus, School, Classroom trên toàn hệ thống.
  - IT_ADMIN / ADMIN: Chỉ được xem và thao tác trên Campus, School, Classroom thuộc Khu vực (campus_id) được phân công.
"""

import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    is_super_admin,
    require_admin,
    require_super_admin,
    resolve_scoped_campus_id,
    validate_org_hierarchy,
    verify_campus_access,
)
from app.core.exceptions import ConflictException, NotFoundException
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.school import Campus, Classroom, School
from app.models.user import User
from app.schemas.school import (
    CampusCreateRequest,
    CampusDto,
    CampusUpdateRequest,
    ClassroomCreateRequest,
    ClassroomDto,
    ClassroomUpdateRequest,
    SchoolCreateRequest,
    SchoolDto,
    SchoolUpdateRequest,
)

router = APIRouter(tags=["Schools"])


async def _ensure_unique_code(
    model_cls: type,
    code: str,
    label: str,
    db: AsyncSession,
    exclude_id: Optional[UUID] = None,
) -> str:
    norm_code = code.strip().upper()
    q = select(model_cls.id).where(model_cls.code == norm_code)
    if exclude_id is not None:
        q = q.where(model_cls.id != exclude_id)
    if (await db.execute(q)).scalar_one_or_none():
        raise ConflictException(f"Mã {label} '{norm_code}' đã tồn tại")
    return norm_code


def _school_to_dto(s: School, campus_name: Optional[str] = None) -> SchoolDto:
    return SchoolDto(
        id=s.id,
        name=s.name,
        code=s.code,
        address=s.address,
        phone=s.phone,
        email=s.email,
        is_active=s.is_active,
        campus_id=s.campus_id,
        campus_name=campus_name if campus_name is not None else (s.campus.name if s.campus else None),
    )


# ═════════════════════════════════════════════════════════════════
# CAMPUS
# ═════════════════════════════════════════════════════════════════

@router.get("/campuses", response_model=ApiResponse[List[CampusDto]])
async def get_campuses(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Campus).where(Campus.is_active == True)
    if not is_super_admin(current_user):
        scoped_campus_id = resolve_scoped_campus_id(current_user)
        query = query.where(Campus.id == scoped_campus_id)
    result = await db.execute(query)
    items = result.scalars().all()
    return ApiResponse.ok([CampusDto.model_validate(c) for c in items])


@router.post("/campuses", response_model=ApiResponse[CampusDto])
async def create_campus(
    request: CampusCreateRequest,
    _: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    code = await _ensure_unique_code(Campus, request.code, "cơ sở", db)
    campus = Campus(
        id=uuid.uuid4(),
        name=request.name,
        code=code,
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
    _: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Campus).where(Campus.id == campus_id))
    campus = result.scalar_one_or_none()
    if not campus:
        raise NotFoundException("Cơ sở không tồn tại")

    if request.name is not None:
        campus.name = request.name
    if request.code is not None:
        campus.code = await _ensure_unique_code(Campus, request.code, "cơ sở", db, exclude_id=campus_id)
    if request.address is not None:
        campus.address = request.address

    await db.commit()
    await db.refresh(campus)
    return ApiResponse.ok(CampusDto.model_validate(campus), "Cập nhật cơ sở thành công")


@router.delete("/campuses/{campus_id}", response_model=ApiResponse[None])
async def delete_campus(
    campus_id: UUID,
    _: User = Depends(require_super_admin),
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
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    scoped_campus_id = resolve_scoped_campus_id(current_user, campus_id)
    query = select(School).where(School.is_active == True)
    if scoped_campus_id:
        query = query.where(School.campus_id == scoped_campus_id)
    items = (await db.execute(query.offset(page * size).limit(size))).scalars().all()
    return ApiResponse.ok([_school_to_dto(s) for s in items])


@router.post("/schools", response_model=ApiResponse[SchoolDto])
async def create_school(
    request: SchoolCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    verify_campus_access(current_user, request.campus_id)
    campus, _, _ = await validate_org_hierarchy(db, campus_id=request.campus_id)
    code = await _ensure_unique_code(School, request.code, "trường học", db)
    school = School(
        id=uuid.uuid4(),
        name=request.name,
        code=code,
        address=request.address,
        phone=request.phone,
        email=request.email,
        campus_id=request.campus_id,
    )
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return ApiResponse.ok(_school_to_dto(school, campus_name=campus.name if campus else None), "Trường đã được tạo")


@router.put("/schools/{school_id}", response_model=ApiResponse[SchoolDto])
async def update_school(
    school_id: UUID,
    request: SchoolUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise NotFoundException("Trường không tồn tại")

    verify_campus_access(current_user, school.campus_id)
    campus_obj = None
    if request.campus_id is not None:
        verify_campus_access(current_user, request.campus_id)
        campus_obj, _, _ = await validate_org_hierarchy(db, campus_id=request.campus_id)

    if request.name is not None:
        school.name = request.name
    if request.code is not None:
        school.code = await _ensure_unique_code(School, request.code, "trường học", db, exclude_id=school_id)
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
    c_name = campus_obj.name if campus_obj else (school.campus.name if school.campus else None)
    return ApiResponse.ok(_school_to_dto(school, campus_name=c_name), "Cập nhật trường thành công")


@router.delete("/schools/{school_id}", response_model=ApiResponse[None])
async def delete_school(
    school_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise NotFoundException("Trường không tồn tại")
    verify_campus_access(current_user, school.campus_id)
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
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Classroom).where(Classroom.is_active == True)
    if school_id:
        res_school = await db.execute(select(School).where(School.id == school_id))
        school = res_school.scalar_one_or_none()
        if not school:
            raise NotFoundException("Trường không tồn tại")
        verify_campus_access(current_user, school.campus_id)
        query = query.where(Classroom.school_id == school_id)
    elif not is_super_admin(current_user):
        scoped_campus_id = resolve_scoped_campus_id(current_user)
        query = query.where(
            Classroom.school_id.in_(
                select(School.id).where(School.campus_id == scoped_campus_id, School.is_active == True)
            )
        )
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([_classroom_to_dto(c) for c in items])


@router.get("/schools/{school_id}/classrooms", response_model=ApiResponse[List[ClassroomDto]])
async def get_classrooms_by_school(
    school_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res_school = await db.execute(select(School).where(School.id == school_id))
    school = res_school.scalar_one_or_none()
    if not school:
        raise NotFoundException("Trường không tồn tại")
    verify_campus_access(current_user, school.campus_id)

    query = select(Classroom).where(
        Classroom.school_id == school_id,
        Classroom.is_active == True,
    )
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([_classroom_to_dto(c) for c in items])


async def _create_classroom_for_school(
    school_id: UUID,
    request: ClassroomCreateRequest,
    current_user: User,
    db: AsyncSession,
) -> ClassroomDto:
    _, school, _ = await validate_org_hierarchy(db, school_id=school_id)
    verify_campus_access(current_user, school.campus_id if school else None)
    code = await _ensure_unique_code(Classroom, request.code, "lớp học", db)

    classroom = Classroom(
        id=uuid.uuid4(),
        name=request.name,
        code=code,
        school_id=school_id,
        capacity=request.capacity,
    )
    db.add(classroom)
    await db.commit()
    await db.refresh(classroom)
    return _classroom_to_dto(classroom)


@router.post("/schools/{school_id}/classrooms", response_model=ApiResponse[ClassroomDto])
async def create_classroom_nested(
    school_id: UUID,
    request: ClassroomCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    dto = await _create_classroom_for_school(school_id, request, current_user, db)
    return ApiResponse.ok(dto, "Lớp học đã được tạo")


@router.post("/classrooms", response_model=ApiResponse[ClassroomDto])
async def create_classroom(
    request: ClassroomCreateRequest,
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if not school_id:
        raise NotFoundException("Thiếu school_id")
    dto = await _create_classroom_for_school(school_id, request, current_user, db)
    return ApiResponse.ok(dto, "Lớp học đã được tạo")


@router.put("/classrooms/{classroom_id}", response_model=ApiResponse[ClassroomDto])
async def update_classroom(
    classroom_id: UUID,
    request: ClassroomUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise NotFoundException("Lớp học không tồn tại")
    verify_campus_access(current_user, classroom.school.campus_id if classroom.school else None)

    if request.name is not None:
        classroom.name = request.name
    if request.code is not None:
        classroom.code = await _ensure_unique_code(Classroom, request.code, "lớp học", db, exclude_id=classroom_id)
    if request.capacity is not None:
        classroom.capacity = request.capacity

    await db.commit()
    await db.refresh(classroom)
    return ApiResponse.ok(_classroom_to_dto(classroom), "Cập nhật lớp học thành công")


@router.delete("/classrooms/{classroom_id}", response_model=ApiResponse[None])
async def delete_classroom(
    classroom_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise NotFoundException("Lớp học không tồn tại")
    verify_campus_access(current_user, classroom.school.campus_id if classroom.school else None)
    classroom.is_active = False
    await db.commit()
    return ApiResponse.ok(message="Lớp học đã bị xóa")
