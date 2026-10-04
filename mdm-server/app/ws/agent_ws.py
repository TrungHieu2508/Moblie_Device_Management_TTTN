"""
Agent WebSocket Endpoint — Trái tim của Phương Án B.

Thay thế hoàn toàn:
  - HeartbeatController.java (POST /devices/heartbeat)
  - HeartbeatService.java
  - OfflineDetectionJob.java (@Scheduled)
  - CommandQueueService.java (Redis queue)
  - JwtChannelInterceptor.java (STOMP auth)

Luồng hoạt động:
  1. Agent kết nối WS + gửi JWT token trong query param
  2. Server xác thực token, chấp nhận kết nối
  3. Server update DB: status = ONLINE
  4. Server broadcast ONLINE event lên Dashboard
  5. Server gửi xuống Agent các lệnh đang PENDING trong DB
  6. Agent gửi metrics, events, command ACKs qua WS message
  7. Khi Agent ngắt kết nối → Server update DB: status = OFFLINE
  8. Server broadcast OFFLINE event lên Dashboard
"""

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_device_from_ws_token
from app.db.session import get_db, async_session_factory
from app.models.command import DeviceCommand
from app.models.device import Device
from app.models.enums import CommandStatus, DeviceStatus, EventType
from app.services.metrics_service import MetricsPersistenceService
from app.ws.connection_manager import manager
from app.ws.notifier import notifier

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket - Agent"])


# ── Helper Functions ──────────────────────────────────────────

async def _update_device_status(device_id: str, status: DeviceStatus) -> None:
    """
    Cập nhật trạng thái device trong DB.
    Dùng session độc lập (không share với WS session) để tránh lỗi
    khi connection bị đứt giữa chừng.
    """
    async with async_session_factory() as db:
        try:
            now = datetime.now(timezone.utc)
            await db.execute(
                update(Device)
                .where(Device.device_id == device_id)
                .values(status=status.value, last_heartbeat_at=now)
            )
            await db.commit()
        except Exception as e:
            logger.error("Failed to update device status for %s: %s", device_id, e)
            await db.rollback()


async def _send_pending_commands(device_id: str, websocket: WebSocket) -> None:
    """
    Gửi tất cả lệnh đang PENDING trong DB xuống Agent khi device vừa kết nối.
    Thay thế CommandQueueService.drainPendingCommands() (Redis).
    """
    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(DeviceCommand)
                .join(Device, DeviceCommand.device_id == Device.id)
                .where(
                    Device.device_id == device_id,
                    DeviceCommand.status == CommandStatus.PENDING,
                )
            )
            pending_commands = result.scalars().all()

            if not pending_commands:
                return

            now = datetime.now(timezone.utc)
            for cmd in pending_commands:
                try:
                    await websocket.send_json({
                        "type": "COMMAND",
                        "data": {
                            "id": str(cmd.id),
                            "commandType": cmd.command_type,
                            "payload": cmd.payload or {},
                        },
                    })
                    cmd.status = CommandStatus.SENT.value
                    cmd.sent_at = now
                except Exception as e:
                    logger.warning("Failed to send pending command %s to device %s: %s",
                                   cmd.id, device_id, e)

            await db.commit()
            logger.info("Sent %d pending commands to device %s", len(pending_commands), device_id)

        except Exception as e:
            logger.error("Error fetching pending commands for %s: %s", device_id, e)
            await db.rollback()


async def _handle_event(device_id: str, event_data: dict) -> None:
    """
    Xử lý event vi phạm từ Agent (gọi EventService/AlertService sau này).
    Hiện tại log để debug.
    """
    event_type = event_data.get("eventType", "UNKNOWN")
    logger.info("Event from device=%s: type=%s data=%s", device_id, event_type, event_data)
    # TODO: Gọi EventService.process_event() ở Sprint 4+


async def _handle_command_ack(device_id: str, ack_data: dict) -> None:
    """
    Cập nhật trạng thái command khi Agent ACK.
    Tương đương CommandService.acknowledgeCommand().
    """
    command_id = ack_data.get("commandId")
    new_status = ack_data.get("status", "EXECUTED")
    error_message = ack_data.get("errorMessage")

    if not command_id:
        return

    async with async_session_factory() as db:
        try:
            now = datetime.now(timezone.utc)
            values = {"status": new_status}

            if new_status == CommandStatus.ACKNOWLEDGED.value:
                values["acknowledged_at"] = now
            elif new_status in (CommandStatus.EXECUTED.value, CommandStatus.FAILED.value):
                values["executed_at"] = now
                if error_message:
                    values["error_message"] = error_message

            await db.execute(
                update(DeviceCommand)
                .where(DeviceCommand.id == command_id)
                .values(**values)
            )
            await db.commit()
            logger.info("Command %s for device %s updated to %s", command_id, device_id, new_status)

        except Exception as e:
            logger.error("Failed to update command ACK: %s", e)
            await db.rollback()


# ── Main WebSocket Endpoint ───────────────────────────────────

@router.websocket("/ws/agent/{device_id}")
async def agent_websocket_endpoint(
    device_id: str,
    websocket: WebSocket,
    token: str = None,  # ?token=<JWT device token>
) -> None:
    """
    ⭐ Endpoint WebSocket chính cho Android Agent.

    URL: ws://<host>/api/ws/agent/{device_id}?token=<device_jwt>

    Message types từ Agent gửi lên:
      {"type": "METRICS",      "data": { ram, cpu, battery, wifi, ... }}
      {"type": "EVENT",        "data": { eventType, packageName, ... }}
      {"type": "COMMAND_ACK",  "data": { commandId, status, errorMessage }}
      {"type": "CURRENT_APP",  "data": { packageName, appName, appIconBase64 }}
    """
    # 1. Xác thực JWT từ query param
    token = websocket.query_params.get("token")

    # Dùng session tạm để xác thực, không giữ trong suốt vòng lặp WS
    async with async_session_factory() as auth_db:
        device = await get_device_from_ws_token(token, auth_db)

    if not device:
        logger.warning("Rejected WS connection: invalid token for device_id=%s", device_id)
        await websocket.close(code=4001, reason="Unauthorized: Invalid device token")
        return

    # Đảm bảo device_id trong URL khớp với token
    if device.device_id != device_id:
        await websocket.close(code=4003, reason="Forbidden: Token does not match device_id")
        return

    # 2. Chấp nhận kết nối → lưu vào ConnectionManager
    await manager.agent_connect(device_id, websocket)

    # 3. Cập nhật trạng thái ONLINE trong DB
    await _update_device_status(device_id, DeviceStatus.ONLINE)

    # 4. Broadcast ONLINE cho tất cả Dashboard
    await notifier.broadcast_device_status(device_id, "ONLINE")

    # 5. Gửi xuống Agent các lệnh đang PENDING
    await _send_pending_commands(device_id, websocket)

    # 6. Vòng lặp nhận message từ Agent
    try:
        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                raise
            except Exception as e:
                logger.warning(f"WS receive error: {e}")
                break

            msg_type = data.get("type", "")
            msg_data = data.get("data", {})

            if msg_type == "METRICS":
                # 1. Cập nhật in-memory cache → real-time cho Dashboard
                manager.update_metrics(device_id, msg_data)
                await notifier.broadcast_device_metrics(device_id, msg_data)

                # 2. Cập nhật last_heartbeat_at định kỳ khi nhận metrics
                await _update_device_status(device_id, DeviceStatus.ONLINE)

                # 3. Lưu DB định kỳ (mỗi METRICS_SAVE_EVERY lần = ~5 phút)
                #    Chạy dưới dạng background task để không block vòng lặp WS
                if MetricsPersistenceService.should_save(device_id):
                    asyncio.create_task(
                        MetricsPersistenceService.save_snapshot(device_id, msg_data)
                    )

            elif msg_type == "CURRENT_APP":
                manager.update_current_app(device_id, msg_data)
                await notifier.broadcast_current_app(device_id, msg_data)

            elif msg_type == "EVENT":
                await _handle_event(device_id, msg_data)

            elif msg_type == "COMMAND_ACK":
                await _handle_command_ack(device_id, msg_data)

            else:
                logger.debug("Unknown message type '%s' from device %s", msg_type, device_id)

    except WebSocketDisconnect:
        logger.info("Device %s disconnected (WebSocketDisconnect)", device_id)

    except Exception as e:
        logger.error("Unexpected error for device %s: %s", device_id, e)

    finally:
        # 7. Dọn dẹp kết nối
        manager.agent_disconnect(device_id)

        # 8. Xoá counter metrics của device này (giải phóng bộ nhớ)
        MetricsPersistenceService.reset_counter(device_id)

        # 9. Cập nhật OFFLINE trong DB
        await _update_device_status(device_id, DeviceStatus.OFFLINE)

        # 10. Broadcast OFFLINE cho tất cả Dashboard
        await notifier.broadcast_device_status(device_id, "OFFLINE")
