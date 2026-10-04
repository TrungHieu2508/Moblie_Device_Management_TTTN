"""
CommandService — Tương đương CommandService.java.

Phương Án B: Dispatch lệnh TRỰC TIẾP qua WebSocket, không dùng Redis queue.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.command import DeviceCommand
from app.models.device import Device
from app.models.enums import CommandStatus, CommandType, DeviceStatus
from app.models.user import User
from app.schemas.command import CommandAckRequest, CommandCreateRequest, CommandDto, PagedCommandResponse
from app.ws.notifier import notifier


def _map_to_dto(cmd: DeviceCommand) -> CommandDto:
    return CommandDto(
        id=cmd.id,
        device_id=cmd.device.device_id if cmd.device else "",
        command_type=CommandType(cmd.command_type),
        payload=cmd.payload,
        status=CommandStatus(cmd.status),
        error_message=cmd.error_message,
        created_at=cmd.created_at,
        sent_at=cmd.sent_at,
        acknowledged_at=cmd.acknowledged_at,
        executed_at=cmd.executed_at,
        created_by=cmd.created_by.username if cmd.created_by else None,
    )


class CommandService:

    @staticmethod
    async def create_command(
        device_uuid: UUID,
        request: CommandCreateRequest,
        current_user: Optional[User],
        db: AsyncSession,
    ) -> CommandDto:
        """
        Tạo lệnh và dispatch ngay nếu device ONLINE.
        Tương đương CommandService.createCommand().

        Phương án B: Không cần Redis queue.
          - ONLINE  → gửi qua WebSocket ngay, status = SENT
          - OFFLINE → giữ PENDING trong DB, tự gửi khi device reconnect WS
        """
        result = await db.execute(select(Device).where(Device.id == device_uuid))
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")

        # Tạo command record trong DB
        command = DeviceCommand(
            id=uuid.uuid4(),
            device_id=device.id,
            command_type=request.command_type.value,
            payload=request.payload,
            status=CommandStatus.PENDING.value,
            created_by_id=current_user.id if current_user else None,
        )
        db.add(command)
        await db.flush()  # Lấy id trước khi commit

        # Chuẩn bị payload gửi xuống Agent
        command_payload = {
            "id": str(command.id),
            "commandType": command.command_type,
            "payload": command.payload or {},
        }

        # Dispatch: thử gửi qua WebSocket
        sent = await notifier.send_command_to_device(device.device_id, command_payload)

        if sent:
            command.status = CommandStatus.SENT.value
            command.sent_at = datetime.now(timezone.utc)
        # else: giữ PENDING → agent_ws.py sẽ gửi khi device reconnect

        # Tạo alert tự động cho các lệnh "phạt"
        punish_commands = {
            "LOCK_SCREEN", "RING_ALARM", "WIPE_DATA", "CLEAR_BACKGROUND_APPS"
        }
        if request.command_type.value in punish_commands and current_user:
            from app.services.alert_service import AlertService
            await AlertService.create_manual_alert(device, request.command_type.value, current_user, db)

        await db.commit()
        await db.refresh(command)
        return _map_to_dto(command)

    @staticmethod
    async def acknowledge_command(
        device_id: str,
        command_id: UUID,
        request: CommandAckRequest,
        db: AsyncSession,
    ) -> None:
        """
        Agent ACK lệnh (qua REST endpoint, backup cho WebSocket ACK).
        Tương đương CommandService.acknowledgeCommand().
        """
        result = await db.execute(select(DeviceCommand).where(DeviceCommand.id == command_id))
        command = result.scalar_one_or_none()
        if not command:
            raise NotFoundException("Lệnh không tồn tại")

        # Kiểm tra lệnh thuộc về device này
        dev_result = await db.execute(select(Device).where(Device.id == command.device_id))
        device = dev_result.scalar_one_or_none()
        if not device or device.device_id != device_id:
            raise NotFoundException("Command không thuộc về thiết bị này")

        now = datetime.now(timezone.utc)
        command.status = request.status.value
        command.error_message = request.error_message

        if request.status == CommandStatus.ACKNOWLEDGED:
            command.acknowledged_at = now
        elif request.status in (CommandStatus.EXECUTED, CommandStatus.FAILED):
            command.executed_at = now

        await db.commit()

    @staticmethod
    async def get_command_history(
        device_uuid: UUID,
        page: int,
        size: int,
        db: AsyncSession,
    ) -> PagedCommandResponse:
        """Lấy lịch sử lệnh theo thiết bị, có phân trang."""
        offset = (page - 1) * size

        count_result = await db.execute(
            select(func.count()).select_from(DeviceCommand).where(DeviceCommand.device_id == device_uuid)
        )
        total = count_result.scalar()

        result = await db.execute(
            select(DeviceCommand)
            .where(DeviceCommand.device_id == device_uuid)
            .order_by(DeviceCommand.created_at.desc())
            .offset(offset)
            .limit(size)
        )
        commands = result.scalars().all()

        return PagedCommandResponse(
            items=[_map_to_dto(c) for c in commands],
            total=total,
            page=page,
            size=size,
        )
