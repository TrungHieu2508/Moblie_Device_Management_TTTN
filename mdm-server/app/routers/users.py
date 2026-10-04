"""
Users Router — Tương đương UserController.java.
"""

import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_admin, require_super_admin
from app.core.exceptions import ConflictException, NotFoundException
from app.core.response import ApiResponse
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.rule_user import ChangePasswordRequest, UserCreateRequest, UserDto, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=ApiResponse[UserDto])
async def get_me(current_user: User = Depends(get_current_user)):
    """Lấy thông tin user đang đăng nhập."""
    return ApiResponse.ok(UserDto.model_validate(current_user))


@router.get("", response_model=ApiResponse[List[UserDto]])
async def get_users(
    school_id: Optional[UUID] = Query(None),
    campus_id: Optional[UUID] = Query(None),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    if school_id:
        query = query.where(User.school_id == school_id)
    if campus_id:
        query = query.where(User.campus_id == campus_id)
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([UserDto.model_validate(u) for u in items])


@router.post("", response_model=ApiResponse[UserDto])
async def create_user(
    request: UserCreateRequest,
    _: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    # Kiểm tra username/email trùng
    existing = await db.execute(
        select(User).where(
            (User.username == request.username) | (User.email == request.email)
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Username hoặc email đã tồn tại")

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
    return ApiResponse.ok(UserDto.model_validate(user), "Tài khoản đã được tạo")


@router.patch("/{user_id}", response_model=ApiResponse[UserDto])
async def update_user(
    user_id: UUID,
    request: UserUpdateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Người dùng không tồn tại")

    if request.full_name is not None:
        user.full_name = request.full_name
    if request.email is not None:
        user.email = request.email
    if request.school_id is not None:
        user.school_id = request.school_id
    if request.campus_id is not None:
        user.campus_id = request.campus_id
    if request.is_active is not None:
        user.is_active = request.is_active

    await db.commit()
    await db.refresh(user)
    return ApiResponse.ok(UserDto.model_validate(user), "Cập nhật thành công")


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
