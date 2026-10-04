"""
Rules Router — Tương đương RuleController.java.
"""

import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.core.exceptions import NotFoundException
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.rule import Rule
from app.models.user import User
from app.schemas.rule_user import RuleCreateRequest, RuleDto, RuleUpdateRequest

router = APIRouter(prefix="/rules", tags=["Rules"])


@router.get("", response_model=ApiResponse[List[RuleDto]])
async def get_rules(
    school_id: Optional[UUID] = Query(None),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Rule).where(Rule.is_active == True)
    if school_id:
        query = query.where(Rule.school_id == school_id)
    items = (await db.execute(query)).scalars().all()
    return ApiResponse.ok([RuleDto.model_validate(r) for r in items])


@router.post("", response_model=ApiResponse[RuleDto])
async def create_rule(
    request: RuleCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rule = Rule(
        id=uuid.uuid4(),
        name=request.name,
        description=request.description,
        rule_type=request.rule_type.value,
        rule_data=request.rule_data,
        school_id=request.school_id,
        severity=request.severity.value,
        is_active=True,
        created_by_id=current_user.id,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return ApiResponse.ok(RuleDto.model_validate(rule), "Quy tắc đã được tạo")


@router.put("/{rule_id}", response_model=ApiResponse[RuleDto])
async def update_rule(
    rule_id: UUID,
    request: RuleUpdateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rule).where(Rule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundException("Quy tắc không tồn tại")

    if request.name is not None:
        rule.name = request.name
    if request.description is not None:
        rule.description = request.description
    if request.rule_data is not None:
        rule.rule_data = request.rule_data
    if request.severity is not None:
        rule.severity = request.severity.value
    if request.is_active is not None:
        rule.is_active = request.is_active

    await db.commit()
    await db.refresh(rule)
    return ApiResponse.ok(RuleDto.model_validate(rule), "Quy tắc đã được cập nhật")


@router.delete("/{rule_id}", response_model=ApiResponse[None])
async def delete_rule(
    rule_id: UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rule).where(Rule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundException("Quy tắc không tồn tại")
    rule.is_active = False
    await db.commit()
    return ApiResponse.ok(message="Quy tắc đã bị xóa")
