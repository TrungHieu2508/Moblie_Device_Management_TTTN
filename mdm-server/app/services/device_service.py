"""
DeviceService — Tương đương DeviceService.java + EnrollmentService.java.
"""

import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import create_device_token
from app.models.device import Device, EnrollmentProfile
from app.models.enums import DeviceStatus
from app.models.school import Campus, Classroom, School
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
        Tương đương DeviceService.registerDevice().
        """
        # Tìm thiết bị đã tồn tại chưa
        result = await db.execute(
            select(Device).where(Device.device_id == request.device_id)
        )
        device = result.scalar_one_or_none()

        if device is None:
            # Thiết bị mới → tạo mới
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
        else:
            # Thiết bị đã tồn tại → cập nhật thông tin
            if request.device_name:
                device.device_name = request.device_name
            if request.android_version:
                device.android_version = request.android_version
            if request.agent_version:
                device.agent_version = request.agent_version

        # Nếu có enrollment code → gán vào school/campus/classroom
        if request.enrollment_code:
            result = await db.execute(
                select(EnrollmentProfile).where(
                    EnrollmentProfile.code == request.enrollment_code.upper(),
                    EnrollmentProfile.is_active == True,
                )
            )
            profile = result.scalar_one_or_none()

            if profile:
                if profile.expires_at and profile.expires_at < datetime.now(timezone.utc):
                    raise ValueError("Mã đăng ký đã hết hạn")
                if profile.max_uses > 0 and profile.current_uses >= profile.max_uses:
                    raise ValueError("Mã đăng ký đã đạt giới hạn sử dụng")

                device.school_id = profile.school_id
                device.campus_id = profile.campus_id
                device.classroom_id = profile.classroom_id

                profile.current_uses += 1

        # Tạo device JWT token
        device_token = create_device_token(device.device_id)
        device.registration_token = device_token

        await db.commit()
        await db.refresh(device)

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
    ) -> List[DeviceDto]:
        """Lấy danh sách thiết bị với filter."""
        query = select(Device)

        if school_id:
            query = query.where(Device.school_id == school_id)
        if campus_id:
            query = query.where(Device.campus_id == campus_id)
        if classroom_id:
            query = query.where(Device.classroom_id == classroom_id)
        if status:
            query = query.where(Device.status == status.value)

        result = await db.execute(query)
        devices = result.scalars().all()
        return [_map_device_to_dto(d) for d in devices]

    @staticmethod
    async def get_device_by_id(device_uuid: UUID, db: AsyncSession) -> DeviceDto:
        result = await db.execute(select(Device).where(Device.id == device_uuid))
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")
        return _map_device_to_dto(device)

    @staticmethod
    async def assign_device(
        device_uuid: UUID, request: DeviceAssignRequest, db: AsyncSession
    ) -> DeviceDto:
        """Gán thiết bị vào trường/cơ sở/lớp."""
        result = await db.execute(select(Device).where(Device.id == device_uuid))
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")

        device.school_id = request.school_id
        device.campus_id = request.campus_id
        device.classroom_id = request.classroom_id
        if request.notes is not None:
            device.notes = request.notes

        await db.commit()
        await db.refresh(device)
        return _map_device_to_dto(device)

    @staticmethod
    async def update_device(
        device_uuid: UUID, request: DeviceUpdateRequest, db: AsyncSession
    ) -> DeviceDto:
        result = await db.execute(select(Device).where(Device.id == device_uuid))
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")

        if request.device_name is not None:
            device.device_name = request.device_name
        if request.notes is not None:
            device.notes = request.notes

        await db.commit()
        await db.refresh(device)
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

        # Validate FK
        for model_cls, id_val, name in [
            (School, request.school_id, "School"),
            (Campus, request.campus_id, "Campus"),
        ]:
            res = await db.execute(select(model_cls).where(model_cls.id == id_val))
            if not res.scalar_one_or_none():
                raise NotFoundException(f"{name} không tồn tại")

        classroom = None
        if request.classroom_id:
            res = await db.execute(select(Classroom).where(Classroom.id == request.classroom_id))
            classroom = res.scalar_one_or_none()
            if not classroom:
                raise NotFoundException("Classroom không tồn tại")

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
