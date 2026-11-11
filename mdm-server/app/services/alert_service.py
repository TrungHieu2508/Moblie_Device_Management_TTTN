"""
AlertService — Tương đương AlertService.java.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.alert import Alert
from app.models.device import Device
from app.models.enums import AlertSeverity, AlertStatus, DeviceStatus
from app.models.rule import Rule
from app.models.user import User
from app.schemas.alert import AlertDto, AlertUpdateRequest, DeviceBasicInfo, PagedAlertResponse, RuleBasicInfo
from app.ws.connection_manager import manager
from app.ws.notifier import notifier


def _map_to_dto(alert: Alert) -> AlertDto:
    dto = AlertDto(
        id=alert.id,
        alert_code=alert.alert_code,
        title=alert.title,
        description=alert.description,
        severity=AlertSeverity(alert.severity),
        status=AlertStatus(alert.status),
        created_at=alert.created_at,
        resolved_at=alert.resolved_at,
        resolution_note=alert.resolution_note,
    )
    if alert.device:
        dto.device = DeviceBasicInfo(
            id=alert.device.id,
            device_id=alert.device.device_id,
            device_name=alert.device.device_name or alert.device.model,
        )
    if alert.rule:
        dto.rule = RuleBasicInfo(
            id=alert.rule.id,
            name=alert.rule.name,
        )
    return dto


class AlertService:

    @staticmethod
    async def create_alert(
        device: Device,
        rule: Rule,
        event_data: object,
        title: str,
        description: str,
        db: AsyncSession,
    ) -> None:
        """
        Tạo alert từ rule vi phạm.
        Bao gồm debouncing để tránh spam.
        Tương đương AlertService.createAlert().
        """
        # Debouncing: tránh tạo alert trùng lặp
        existing = await db.execute(
            select(Alert).where(
                Alert.device_id == device.id,
                Alert.rule_id == rule.id,
                Alert.status.in_([AlertStatus.NEW.value, AlertStatus.PROCESSING.value]),
            )
        )
        if existing.scalars().first():
            return  # Đã có alert đang xử lý cho rule này

        alert = Alert(
            id=uuid.uuid4(),
            alert_code=rule.rule_type,
            title=title,
            description=description,
            severity=rule.severity,
            status=AlertStatus.NEW.value,
            device_id=device.id,
            school_id=device.school_id,
            campus_id=device.campus_id,
            classroom_id=device.classroom_id,
            rule_id=rule.id,
            event_data=event_data,
        )
        db.add(alert)

        # Cập nhật DeviceStatus dựa vào severity
        if rule.severity == AlertSeverity.CRITICAL.value:
            device.status = DeviceStatus.CRITICAL.value
        elif device.status != DeviceStatus.CRITICAL.value:
            device.status = DeviceStatus.WARNING.value

        await db.commit()
        await db.refresh(alert)

        await notifier.broadcast_new_alert(_map_to_dto(alert).model_dump(mode="json"))

    @staticmethod
    async def create_manual_alert(
        device: Device,
        command_type: str,
        admin_user: User,
        db: AsyncSession,
    ) -> None:
        """
        Tạo alert từ lệnh thủ công của Admin.
        Tương đương AlertService.createManualAlert().
        """
        alert_map = {
            "LOCK_SCREEN": (
                "Khóa màn hình thủ công",
                f"Quản trị viên {admin_user.username} đã khóa màn hình thiết bị.",
                AlertSeverity.WARNING,
                DeviceStatus.WARNING,
            ),
            "RING_ALARM": (
                "Phát cảnh báo thủ công",
                f"Quản trị viên {admin_user.username} đã phát âm thanh cảnh báo.",
                AlertSeverity.WARNING,
                DeviceStatus.WARNING,
            ),
            "WIPE_DATA": (
                "Xóa dữ liệu thủ công",
                f"Quản trị viên {admin_user.username} đã yêu cầu Factory Reset.",
                AlertSeverity.CRITICAL,
                DeviceStatus.CRITICAL,
            ),
            "CLEAR_BACKGROUND_APPS": (
                "Dọn dẹp RAM thủ công",
                f"Quản trị viên {admin_user.username} đã dọn dẹp RAM thiết bị.",
                AlertSeverity.WARNING,
                None,
            ),
        }
        if command_type not in alert_map:
            return

        title, description, severity, new_device_status = alert_map[command_type]

        alert = Alert(
            id=uuid.uuid4(),
            alert_code=f"MANUAL_{command_type}",
            title=title,
            description=description,
            severity=severity.value,
            status=AlertStatus.NEW.value,
            device_id=device.id,
            school_id=device.school_id,
            campus_id=device.campus_id,
            classroom_id=device.classroom_id,
        )
        db.add(alert)

        if new_device_status:
            device.status = new_device_status.value

        await db.commit()
        await db.refresh(alert)
        await notifier.broadcast_new_alert(_map_to_dto(alert).model_dump(mode="json"))

    @staticmethod
    async def get_alerts(
        campus_id: Optional[UUID],
        status: Optional[AlertStatus],
        page: int,
        size: int,
        db: AsyncSession,
        severity: Optional[str] = None,
        search: Optional[str] = None,
    ) -> PagedAlertResponse:
        offset = max(page, 0) * size

        filters = []
        if campus_id:
            filters.append(Alert.campus_id == campus_id)
        if status:
            filters.append(Alert.status == status.value)
        if severity:
            filters.append(Alert.severity == severity)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(
                or_(
                    Alert.title.ilike(pattern),
                    Alert.description.ilike(pattern),
                    Alert.alert_code.ilike(pattern),
                )
            )

        count_q = select(func.count()).select_from(Alert)
        if filters:
            count_q = count_q.where(*filters)
        total = (await db.execute(count_q)).scalar() or 0

        q = select(Alert).order_by(Alert.created_at.desc()).offset(offset).limit(size)
        if filters:
            q = q.where(*filters)
        alerts = (await db.execute(q)).scalars().all()
        dtos = [_map_to_dto(a) for a in alerts]

        return PagedAlertResponse(
            items=dtos,
            content=dtos,
            total=total,
            total_elements=total,
            page=page,
            size=size,
        )

    @staticmethod
    async def update_alert_status(
        alert_id: UUID,
        request: AlertUpdateRequest,
        resolved_by: User,
        db: AsyncSession,
    ) -> AlertDto:
        """Tương đương AlertService.updateAlertStatus()."""
        result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalar_one_or_none()
        if not alert:
            raise NotFoundException("Cảnh báo không tồn tại")

        from app.core.dependencies import verify_campus_access
        verify_campus_access(resolved_by, alert.campus_id)

        alert.status = request.status.value
        alert.resolution_note = request.resolution_note

        if request.status in (AlertStatus.RESOLVED, AlertStatus.DISMISSED):
            alert.resolved_at = datetime.now(timezone.utc)
            alert.resolved_by_id = resolved_by.id

            # Kiểm tra device còn alert nào đang mở không
            other_active = await db.execute(
                select(Alert).where(
                    Alert.device_id == alert.device_id,
                    Alert.id != alert.id,
                    Alert.status.in_([AlertStatus.NEW.value, AlertStatus.PROCESSING.value]),
                )
            )
            if not other_active.scalars().first():
                # Không còn alert nào → phục hồi về ONLINE (nếu đang kết nối) hoặc OFFLINE
                dev_result = await db.execute(select(Device).where(Device.id == alert.device_id))
                device = dev_result.scalar_one_or_none()
                if device:
                    new_st = (
                        DeviceStatus.ONLINE.value
                        if manager.is_device_online(device.device_id)
                        else DeviceStatus.OFFLINE.value
                    )
                    device.status = new_st

        await db.commit()
        await db.refresh(alert)

        dto = _map_to_dto(alert)
        await notifier.broadcast_alert_status_change(str(alert.id), dto.model_dump(mode="json"))
        return dto

    @staticmethod
    async def resolve_all_alerts(
        resolved_by: User,
        db: AsyncSession,
    ) -> int:
        """Giải quyết tất cả cảnh báo đang mở (NEW, PROCESSING) thuộc phạm vi Khu vực của người dùng."""
        from app.core.dependencies import is_super_admin, resolve_scoped_campus_id

        query = select(Alert).where(
            Alert.status.in_([AlertStatus.NEW.value, AlertStatus.PROCESSING.value])
        )
        if not is_super_admin(resolved_by):
            scoped_campus_id = resolve_scoped_campus_id(resolved_by)
            query = query.where(Alert.campus_id == scoped_campus_id)

        result = await db.execute(query)
        active_alerts = result.scalars().all()
        if not active_alerts:
            return 0

        now = datetime.now(timezone.utc)
        affected_device_ids = set()
        for alert in active_alerts:
            alert.status = AlertStatus.RESOLVED.value
            alert.resolved_at = now
            alert.resolved_by_id = resolved_by.id
            affected_device_ids.add(alert.device_id)

        if affected_device_ids:
            dev_res = await db.execute(
                select(Device).where(Device.id.in_(affected_device_ids))
            )
            for dev in dev_res.scalars().all():
                dev.status = (
                    DeviceStatus.ONLINE.value
                    if manager.is_device_online(dev.device_id)
                    else DeviceStatus.OFFLINE.value
                )

        await db.commit()
        return len(active_alerts)
