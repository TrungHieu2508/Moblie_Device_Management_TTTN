"""
DeviceService — Tương đương DeviceService.java + EnrollmentService.java.
"""

import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import validate_org_hierarchy, verify_campus_access
from app.core.exceptions import ConflictException, MdmException, NotFoundException
from app.core.security import create_device_token
from app.models.device import Device, EnrollmentProfile
from app.models.enums import DeviceStatus
from app.models.school import Campus, Classroom, School
from app.models.user import User
from app.schemas.device import (
    CreateEnrollmentRequest,
    DeviceAssignRequest,
    DeviceDto,
    DeviceRegistrationRequest,
    DeviceRegistrationResponse,
    DeviceUpdateRequest,
    EnrollmentDto,
    ServerConfig,
)
from app.ws.connection_manager import manager


def _map_device_to_dto(device: Device) -> DeviceDto:
    """Chuyển Device ORM → DeviceDto, bổ sung real-time data từ memory cache."""
    dto = DeviceDto(
        id=device.id,
        device_id=device.device_id,
        device_name=device.device_name,
        serial_number=device.serial_number,
        model=device.model,
        android_version=device.android_version,
        agent_version=device.agent_version,
        status=DeviceStatus(device.status),
        last_heartbeat_at=device.last_heartbeat_at,
        registered_at=device.registered_at,
        notes=device.notes,
        # Real-time data từ ConnectionManager (in-memory cache, thay Redis)
        metrics=manager.get_metrics(device.device_id),
        current_app=manager.get_current_app(device.device_id),
    )
    if device.school:
        from app.schemas.device import SchoolBasicInfo
        dto.school = SchoolBasicInfo(id=device.school.id, name=device.school.name, code=device.school.code)
    if device.campus:
        from app.schemas.device import CampusBasicInfo
        dto.campus = CampusBasicInfo(id=device.campus.id, name=device.campus.name, code=device.campus.code)
    if device.classroom:
        from app.schemas.device import ClassroomBasicInfo
        dto.classroom = ClassroomBasicInfo(id=device.classroom.id, name=device.classroom.name, code=device.classroom.code)
    return dto


class DeviceService:

    @staticmethod
    async def register_device(
        request: DeviceRegistrationRequest, db: AsyncSession
    ) -> DeviceRegistrationResponse:
        """
        Đăng ký thiết bị mới hoặc update thiết bị đã tồn tại.
        Kiểm tra hợp lệ & tiêu thụ atomic lượt dùng EnrollmentProfile khi có enrollmentCode.
        """
        # 1. Xác thực mã ghi danh QR trước khi tạo/cập nhật device (nếu được cung cấp)
        profile: Optional[EnrollmentProfile] = None
        raw_code = (request.enrollment_code or "").strip()
        if raw_code:
            res_prof = await db.execute(
                select(EnrollmentProfile).where(
                    EnrollmentProfile.code == raw_code.upper(),
                    EnrollmentProfile.is_active == True,
                )
            )
            profile = res_prof.scalar_one_or_none()
            if not profile:
                raise NotFoundException("Mã ghi danh QR không tồn tại hoặc đã bị vô hiệu hóa")

            if profile.expires_at:
                exp_at = (
                    profile.expires_at
                    if profile.expires_at.tzinfo
                    else profile.expires_at.replace(tzinfo=timezone.utc)
                )
                if exp_at < datetime.now(timezone.utc):
                    raise ValueError("Mã đăng ký đã hết hạn")

            # Tiêu thụ lượt sử dụng theo kiểu atomic để chống race condition vượt max_uses
            quota_stmt = (
                update(EnrollmentProfile)
                .where(
                    EnrollmentProfile.id == profile.id,
                    EnrollmentProfile.is_active == True,
                    or_(
                        EnrollmentProfile.max_uses == 0,
                        EnrollmentProfile.current_uses < EnrollmentProfile.max_uses,
                    ),
                )
                .values(current_uses=EnrollmentProfile.current_uses + 1)
            )
            quota_res = await db.execute(quota_stmt)
            if quota_res.rowcount == 0:
                raise ValueError("Mã đăng ký đã đạt giới hạn sử dụng")

        # 2. Tìm thiết bị đã tồn tại hoặc tạo mới (xử lý race condition tạo trùng đồng thời)
        result = await db.execute(
            select(Device).where(Device.device_id == request.device_id)
        )
        device = result.scalar_one_or_none()

        if device is None:
            device = Device(
                id=uuid.uuid4(),
                device_id=request.device_id,
                device_name=request.device_name,
                serial_number=request.serial_number,
                model=request.model,
                android_version=request.android_version,
                agent_version=request.agent_version,
                status=DeviceStatus.PENDING,
            )
            db.add(device)
            try:
                await db.flush()
            except IntegrityError:
                await db.rollback()
                # Một request song song vừa kịp tạo device này → tải lại bản ghi vừa tạo
                res_retry = await db.execute(
                    select(Device).where(Device.device_id == request.device_id)
                )
                device = res_retry.scalar_one_or_none()
                if not device:
                    raise
                if request.device_name:
                    device.device_name = request.device_name
                if request.android_version:
                    device.android_version = request.android_version
                if request.agent_version:
                    device.agent_version = request.agent_version
        else:
            if request.device_name:
                device.device_name = request.device_name
            if request.android_version:
                device.android_version = request.android_version
            if request.agent_version:
                device.agent_version = request.agent_version

        if profile is not None:
            device.school_id = profile.school_id
            device.campus_id = profile.campus_id
            device.classroom_id = profile.classroom_id

        # Tạo device JWT token
        device_token = create_device_token(device.device_id)
        device.registration_token = device_token

        await db.commit()
        await db.refresh(device)
        manager.set_device_campus(device.device_id, device.campus_id)

        return DeviceRegistrationResponse(
            device_uuid=device.id,
            registration_token=device_token,
            token_expires_at=None,  # JWT tự xử lý expiry
            campus_name=device.campus.name if device.campus else None,
            school_name=device.school.name if device.school else None,
            classroom_name=device.classroom.name if device.classroom else None,
            server_config=ServerConfig(
                heartbeat_interval_seconds=30,
                websocket_url=settings.ws_url,
            ),
        )

    @staticmethod
    async def get_all_devices(
        db: AsyncSession,
        school_id: Optional[UUID] = None,
        campus_id: Optional[UUID] = None,
        classroom_id: Optional[UUID] = None,
        status: Optional[DeviceStatus] = None,
        search: Optional[str] = None,
        android_version: Optional[str] = None,
        min_battery: Optional[int] = None,
        max_battery: Optional[int] = None,
    ) -> List[DeviceDto]:
        """Lấy danh sách thiết bị với filter (bao gồm lọc mức pin real-time)."""
        query = select(Device)

        if school_id:
            query = query.where(Device.school_id == school_id)
        if campus_id:
            query = query.where(Device.campus_id == campus_id)
        if classroom_id:
            query = query.where(Device.classroom_id == classroom_id)
        if status:
            query = query.where(Device.status == status.value)
        if android_version:
            query = query.where(Device.android_version.ilike(f"%{android_version.strip()}%"))
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Device.device_name.ilike(pattern),
                    Device.model.ilike(pattern),
                    Device.device_id.ilike(pattern),
                    Device.serial_number.ilike(pattern),
                )
            )

        query = query.order_by(Device.created_at.desc())
        result = await db.execute(query)
        devices = result.scalars().all()
        dtos = [_map_device_to_dto(d) for d in devices]

        if min_battery is not None or max_battery is not None:
            filtered: List[DeviceDto] = []
            for dto in dtos:
                bat = (dto.metrics or {}).get("batteryLevel")
                if not isinstance(bat, (int, float)):
                    continue
                if min_battery is not None and bat < min_battery:
                    continue
                if max_battery is not None and bat > max_battery:
                    continue
                filtered.append(dto)
            return filtered

        return dtos

    @staticmethod
    async def get_device_by_id(device_uuid: UUID, db: AsyncSession) -> DeviceDto:
        result = await db.execute(select(Device).where(Device.id == device_uuid))
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")
        return _map_device_to_dto(device)

    @staticmethod
    async def assign_device(
        device_uuid: UUID,
        request: DeviceAssignRequest,
        db: AsyncSession,
        current_user: Optional[User] = None,
    ) -> DeviceDto:
        """Gán thiết bị vào trường/cơ sở/lớp sau khi kiểm tra phân cấp hợp lệ."""
        result = await db.execute(select(Device).where(Device.id == device_uuid))
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")

        _, school, classroom = await validate_org_hierarchy(
            db,
            campus_id=request.campus_id,
            school_id=request.school_id,
            classroom_id=request.classroom_id,
        )
        eff_campus_id = request.campus_id
        if eff_campus_id is None and school is not None:
            eff_campus_id = school.campus_id
        elif eff_campus_id is None and classroom is not None and classroom.school is not None:
            eff_campus_id = classroom.school.campus_id

        if current_user is not None:
            verify_campus_access(current_user, eff_campus_id)

        device.school_id = request.school_id
        device.campus_id = eff_campus_id
        device.classroom_id = request.classroom_id
        if request.notes is not None:
            device.notes = request.notes

        await db.commit()
        await db.refresh(device)
        manager.set_device_campus(device.device_id, device.campus_id)
        return _map_device_to_dto(device)

    @staticmethod
    async def update_device(
        device_uuid: UUID,
        request: DeviceUpdateRequest,
        db: AsyncSession,
        current_user: Optional[User] = None,
    ) -> DeviceDto:
        result = await db.execute(select(Device).where(Device.id == device_uuid))
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")

        eff_campus = request.campus_id if request.campus_id is not None else device.campus_id
        eff_school = request.school_id if request.school_id is not None else device.school_id
        eff_classroom = request.classroom_id if request.classroom_id is not None else device.classroom_id
        if request.campus_id is not None or request.school_id is not None or request.classroom_id is not None:
            await validate_org_hierarchy(
                db,
                campus_id=eff_campus,
                school_id=eff_school,
                classroom_id=eff_classroom,
            )

        if current_user is not None:
            verify_campus_access(current_user, eff_campus)

        if request.device_name is not None:
            device.device_name = request.device_name
        if request.notes is not None:
            device.notes = request.notes
        if request.campus_id is not None:
            device.campus_id = request.campus_id
        if request.school_id is not None:
            device.school_id = request.school_id
        if request.classroom_id is not None:
            device.classroom_id = request.classroom_id

        await db.commit()
        await db.refresh(device)
        manager.set_device_campus(device.device_id, device.campus_id)
        return _map_device_to_dto(device)

    @staticmethod
    async def delete_device(device_uuid: UUID, db: AsyncSession) -> None:
        result = await db.execute(select(Device).where(Device.id == device_uuid))
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")
        await db.delete(device)
        await db.commit()

    # ── Enrollment ─────────────────────────────────────────────

    @staticmethod
    async def create_enrollment(
        request: CreateEnrollmentRequest, db: AsyncSession
    ) -> EnrollmentDto:
        """Tương đương EnrollmentService.createEnrollmentProfile()."""
        from datetime import timedelta

        # Validate FK + phân cấp Campus -> School -> Classroom
        await validate_org_hierarchy(
            db,
            campus_id=request.campus_id,
            school_id=request.school_id,
            classroom_id=request.classroom_id,
        )

        # Sinh code 6 ký tự unique
        chars = string.ascii_uppercase + string.digits
        code = "".join(secrets.choice(chars) for _ in range(6))
        while True:
            res = await db.execute(select(EnrollmentProfile).where(EnrollmentProfile.code == code))
            if not res.scalar_one_or_none():
                break
            code = "".join(secrets.choice(chars) for _ in range(6))

        expires_days = request.expires_in_days or 7
        profile = EnrollmentProfile(
            id=uuid.uuid4(),
            code=code,
            school_id=request.school_id,
            campus_id=request.campus_id,
            classroom_id=request.classroom_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=expires_days),
            max_uses=request.max_uses or 0,
            current_uses=0,
            is_active=True,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

        return EnrollmentDto(
            id=profile.id,
            code=profile.code,
            school_id=profile.school_id,
            school_name=profile.school.name if profile.school else "",
            campus_id=profile.campus_id,
            campus_name=profile.campus.name if profile.campus else "",
            classroom_id=profile.classroom_id,
            classroom_name=profile.classroom.name if profile.classroom else None,
            expires_at=profile.expires_at,
            max_uses=profile.max_uses,
            current_uses=profile.current_uses,
            is_active=profile.is_active,
        )

    @staticmethod
    async def get_enrollments(campus_id: Optional[UUID], db: AsyncSession) -> List[EnrollmentDto]:
        query = select(EnrollmentProfile).where(EnrollmentProfile.is_active == True)
        if campus_id:
            query = query.where(EnrollmentProfile.campus_id == campus_id)

        query = query.order_by(EnrollmentProfile.created_at.desc())
        result = await db.execute(query)
        profiles = result.scalars().all()

        return [
            EnrollmentDto(
                id=p.id,
                code=p.code,
                school_id=p.school_id,
                school_name=p.school.name if p.school else "",
                campus_id=p.campus_id,
                campus_name=p.campus.name if p.campus else "",
                classroom_id=p.classroom_id,
                classroom_name=p.classroom.name if p.classroom else None,
                expires_at=p.expires_at,
                max_uses=p.max_uses,
                current_uses=p.current_uses,
                is_active=p.is_active,
            )
            for p in profiles
        ]

    @staticmethod
    async def delete_enrollment(enrollment_id: UUID, db: AsyncSession) -> None:
        result = await db.execute(select(EnrollmentProfile).where(EnrollmentProfile.id == enrollment_id))
        profile = result.scalar_one_or_none()
        if not profile:
            raise NotFoundException("Enrollment profile không tồn tại")
        profile.is_active = False
        await db.commit()
