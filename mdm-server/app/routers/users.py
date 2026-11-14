"""
Users Router — Tương đương UserController.java.
"""

import uuid
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    ALLOWED_USER_ROLES,
    get_current_user,
    require_super_admin,
    validate_org_hierarchy,
)
from app.core.exceptions import ConflictException, MdmException, NotFoundException
from app.core.response import ApiResponse
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.user import RefreshToken, User
from app.schemas.device import CampusBasicInfo, SchoolBasicInfo
from app.schemas.rule_user import (
    ChangePasswordRequest,
    ProfileUpdateRequest,
    UserCreateRequest,
    UserDto,
    UserUpdateRequest,
)

router = APIRouter(prefix="/users", tags=["Users"])


def _map_user_to_dto(u: User) -> UserDto:
    dto = UserDto(
        id=u.id,
        username=u.username,
        email=u.email,
        full_name=u.full_name,
        role=u.role,
        school_id=u.school_id,
        campus_id=u.campus_id,
        is_active=bool(u.is_active),
        last_login_at=u.last_login_at,
        created_at=u.created_at,
    )
    if u.school:
        dto.school = SchoolBasicInfo(id=u.school.id, name=u.school.name, code=u.school.code)
    if u.campus:
        dto.campus = CampusBasicInfo(id=u.campus.id, name=u.campus.name, code=u.campus.code)
    return dto


@router.get("/me", response_model=ApiResponse[UserDto])
async def get_me(current_user: User = Depends(get_current_user)):
    """Lấy thông tin user đang đăng nhập."""
    return ApiResponse.ok(_map_user_to_dto(current_user))


@router.get("/me/profile", response_model=ApiResponse[UserDto])
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Alias cho ProfilePage: GET /users/me/profile."""
    return ApiResponse.ok(_map_user_to_dto(current_user))


async def _ensure_unique_email(db: AsyncSession, email: str, exclude_user_id: Optional[UUID] = None) -> None:
    """Kiểm tra email chưa thuộc về tài khoản khác (tránh HTTP 500 IntegrityError)."""
    q = select(User.id).where(User.email == email)
    if exclude_user_id is not None:
        q = q.where(User.id != exclude_user_id)
    if (await db.execute(q)).scalar_one_or_none():
        raise ConflictException("Email đã được sử dụng bởi tài khoản khác")


@router.patch("/me/profile", response_model=ApiResponse[UserDto])
async def update_my_profile(
    request: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật hồ sơ cá nhân: PATCH /users/me/profile."""
    if request.email is not None and request.email != current_user.email:
        await _ensure_unique_email(db, request.email, exclude_user_id=current_user.id)
        current_user.email = request.email
    if request.full_name is not None:
        current_user.full_name = request.full_name
    if request.password:
        current_user.password_hash = hash_password(request.password)

    await db.commit()
    await db.refresh(current_user)
    return ApiResponse.ok(_map_user_to_dto(current_user), "Cập nhật hồ sơ thành công")


@router.get("", response_model=ApiResponse[Any])
async def get_users(
    school_id: Optional[UUID] = Query(None, alias="schoolId"),
    campus_id: Optional[UUID] = Query(None, alias="campusId"),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=0),
    size: Optional[int] = Query(None, ge=1, le=500),
    paged: bool = Query(False),
    _: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Chỉ SUPER_ADMIN mới được xem và tìm kiếm danh sách toàn bộ tài khoản hệ thống."""
    base_query = select(User)
    if school_id:
        base_query = base_query.where(User.school_id == school_id)
    if campus_id:
        base_query = base_query.where(User.campus_id == campus_id)
    if role:
        base_query = base_query.where(User.role == role)
    if search:
        pattern = f"%{search.strip()}%"
        base_query = base_query.where(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )

    ordered_query = base_query.order_by(User.created_at.desc())

    if paged:
        p = page or 0
        s = size or 10
        total = (await db.execute(select(func.count()).select_from(base_query.subquery()))).scalar() or 0
        items = (await db.execute(ordered_query.offset(p * s).limit(s))).scalars().all()
        total_pages = (total + s - 1) // s if s else 0
        return ApiResponse.ok({
            "content": [_map_user_to_dto(u) for u in items],
            "totalElements": total,
            "totalPages": total_pages,
            "size": s,
            "number": p,
        })

    if page is not None or size is not None:
        p = page or 0
        s = size or 20
        ordered_query = ordered_query.offset(p * s).limit(s)

    items = (await db.execute(ordered_query)).scalars().all()
    return ApiResponse.ok([_map_user_to_dto(u) for u in items])


@router.post("", response_model=ApiResponse[UserDto])
async def create_user(
    request: UserCreateRequest,
    _: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    if request.role not in ALLOWED_USER_ROLES:
        raise MdmException(
            f"Vai trò '{request.role}' không còn được hỗ trợ. Hệ thống chỉ hỗ trợ SUPER_ADMIN và IT_ADMIN.",
            status_code=400,
            error_code="INVALID_ROLE",
        )

    # Kiểm tra username/email trùng
    existing = await db.execute(
        select(User).where(
            (User.username == request.username) | (User.email == request.email)
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Username hoặc email đã tồn tại")

    await validate_org_hierarchy(
        db,
        campus_id=request.campus_id,
        school_id=request.school_id,
    )

    user = User(
        id=uuid.uuid4(),
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=request.role,
        school_id=request.school_id,
        campus_id=request.campus_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return ApiResponse.ok(_map_user_to_dto(user), "Tài khoản đã được tạo")


@router.patch("/{user_id}", response_model=ApiResponse[UserDto])
async def update_user(
    user_id: UUID,
    request: UserUpdateRequest,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Người dùng không tồn tại")

    if user_id == current_user.id and request.is_active is False:
        raise MdmException(
            "Không thể tự vô hiệu hóa tài khoản đang đăng nhập",
            status_code=400,
            error_code="SELF_DEACTIVATION",
        )

    if request.email is not None and request.email != user.email:
        await _ensure_unique_email(db, request.email, exclude_user_id=user_id)

    eff_campus_id = request.campus_id if request.campus_id is not None else user.campus_id
    campus_changed_without_school = (
        request.campus_id is not None
        and request.campus_id != user.campus_id
        and request.school_id is None
    )
    eff_school_id = (
        request.school_id
        if request.school_id is not None
        else (None if campus_changed_without_school else user.school_id)
    )
    if request.campus_id is not None or request.school_id is not None:
        await validate_org_hierarchy(db, campus_id=eff_campus_id, school_id=eff_school_id)

    if request.full_name is not None:
        user.full_name = request.full_name
    if request.email is not None:
        user.email = request.email
    if request.password:
        user.password_hash = hash_password(request.password)
    if request.campus_id is not None:
        user.campus_id = request.campus_id
        if campus_changed_without_school:
            user.school_id = None
    if request.school_id is not None:
        user.school_id = request.school_id
    if request.is_active is not None:
        user.is_active = request.is_active
        if request.is_active is False:
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == user.id, RefreshToken.is_revoked == False)
                .values(is_revoked=True)
            )

    await db.commit()
    await db.refresh(user)
    return ApiResponse.ok(_map_user_to_dto(user), "Cập nhật thành công")


@router.delete("/{user_id}", response_model=ApiResponse[None])
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise ConflictException("Không thể tự xóa tài khoản đang đăng nhập")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Người dùng không tồn tại")
    await db.delete(user)
    await db.commit()
    return ApiResponse.ok(message="Đã xóa tài khoản")


@router.post("/me/change-password", response_model=ApiResponse[None])
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(request.old_password, current_user.password_hash):
        raise ValueError("Mật khẩu cũ không đúng")

    current_user.password_hash = hash_password(request.new_password)
    await db.commit()
    return ApiResponse.ok(message="Đổi mật khẩu thành công")
