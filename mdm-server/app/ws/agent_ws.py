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
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_device_from_ws_token
from app.db.session import get_db, async_session_factory
from app.models.alert import Alert
from app.models.command import DeviceCommand
from app.models.device import Device
from app.models.enums import AlertSeverity, AlertStatus, CommandStatus, DeviceStatus, EventType
from app.models.event import DeviceEvent
from app.models.rule import Rule
from app.services.alert_service import _map_to_dto
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


async def _touch_device_heartbeat(device_id: str) -> None:
    """
    Cập nhật last_heartbeat_at khi nhận METRICS định kỳ.
    Không ghi đè status nếu thiết bị đang ở trạng thái WARNING hoặc CRITICAL.
    """
    async with async_session_factory() as db:
        try:
            now = datetime.now(timezone.utc)
            result = await db.execute(select(Device).where(Device.device_id == device_id))
            dev = result.scalar_one_or_none()
            if dev:
                dev.last_heartbeat_at = now
                if dev.status == DeviceStatus.OFFLINE.value:
                    dev.status = DeviceStatus.ONLINE.value
                await db.commit()
        except Exception as e:
            logger.error("Failed to touch device heartbeat for %s: %s", device_id, e)
            await db.rollback()


async def _send_active_policies(device_id: str, websocket: WebSocket) -> None:
    """
    Gửi danh sách quy tắc (Whitelist / Blacklist) đang kích hoạt xuống Agent khi kết nối.
    """
    async with async_session_factory() as db:
        try:
            dev_res = await db.execute(select(Device).where(Device.device_id == device_id))
            dev = dev_res.scalar_one_or_none()
            if not dev:
                return

            rule_query = select(Rule).where(Rule.is_active == True)
            if dev.school_id:
                rule_query = rule_query.where(
                    or_(Rule.school_id == dev.school_id, Rule.school_id.is_(None))
                )
            else:
                rule_query = rule_query.where(Rule.school_id.is_(None))

            rules = (await db.execute(rule_query)).scalars().all()
            whitelist: list[str] = []
            blacklist: list[str] = []

            for r in rules:
                rdata = r.rule_data or {}
                pkgs: list[str] = []
                for key in ("packages", "apps", "packageNames"):
                    val = rdata.get(key)
                    if isinstance(val, list):
                        pkgs.extend(str(p) for p in val if p)
                single_pkg = rdata.get("packageName")
                if isinstance(single_pkg, str) and single_pkg:
                    pkgs.append(single_pkg)

                if r.rule_type == "APP_WHITELIST":
                    whitelist.extend(pkgs)
                elif r.rule_type == "APP_BLACKLIST":
                    blacklist.extend(pkgs)

            await websocket.send_json({
                "type": "SYNC_POLICIES",
                "data": {
                    "whitelist": list(dict.fromkeys(whitelist)),
                    "blacklist": list(dict.fromkeys(blacklist)),
                    "isWhitelistMode": len(whitelist) > 0,
                },
            })
        except Exception as e:
            logger.warning("Failed to send active policies to %s: %s", device_id, e)


async def broadcast_policies_to_online_agents() -> None:
    """
    Đẩy danh sách quy tắc (Whitelist / Blacklist) mới nhất xuống toàn bộ Agent đang Online.
    Được gọi mỗi khi Admin thêm / sửa / bật tắt / xóa Rule trên Web Dashboard.
    """
    online_ids = manager.get_online_device_ids()
    for dev_id in online_ids:
        ws = manager.agent_connections.get(dev_id)
        if ws:
            await _send_active_policies(dev_id, ws)


async def _handle_event(device_id: str, event_data: dict) -> None:
    """
    Xử lý event vi phạm từ Agent:
      1. Lưu vào bảng device_events
      2. Tạo Alert tương ứng vào bảng alerts (có chống trùng lặp 60s)
      3. Cập nhật trạng thái thiết bị (WARNING / CRITICAL)
      4. Broadcast NEW_ALERT + DEVICE_STATUS lên tất cả Dashboard
    """
    event_type = event_data.get("eventType", "UNKNOWN")
    payload = event_data.get("payload") if isinstance(event_data.get("payload"), dict) else event_data
    logger.info("Event from device=%s: type=%s data=%s", device_id, event_type, event_data)

    async with async_session_factory() as db:
        try:
            dev_res = await db.execute(select(Device).where(Device.device_id == device_id))
            dev = dev_res.scalar_one_or_none()
            if not dev:
                return

            now = datetime.now(timezone.utc)

            # 1. Lưu DeviceEvent
            dev_event = DeviceEvent(
                device_id=dev.id,
                event_type=event_type,
                event_data=payload,
                occurred_at=now,
                processed=True,
                processed_at=now,
            )
            db.add(dev_event)
            await db.flush()

            # 2. Kiểm tra chống spam alert (60s gần nhất cho cùng loại sự kiện trên thiết bị này)
            cutoff = now - timedelta(seconds=60)
            dup_res = await db.execute(
                select(Alert).where(
                    Alert.device_id == dev.id,
                    Alert.alert_code == event_type,
                    Alert.status.in_([AlertStatus.NEW.value, AlertStatus.PROCESSING.value]),
                    Alert.created_at >= cutoff,
                )
            )
            if dup_res.scalars().first() is not None:
                await db.commit()
                return

            # 3. Xác định mức độ và tiêu đề cảnh báo
            pkg_name = payload.get("packageName") or ""
            app_name = payload.get("appName") or pkg_name or "Ứng dụng hạn chế"
            details = payload.get("details") or ""

            if event_type == EventType.UNAUTHORIZED_UNLOCK_ATTEMPT.value:
                severity = AlertSeverity.CRITICAL.value
                title = f"Cố tình mở khóa trái phép trên {dev.device_name or dev.device_id}"
                description = details or "Học sinh đã nhập sai mật khẩu mở khóa MDM nhiều lần liên tiếp."
                dev.status = DeviceStatus.CRITICAL.value
            elif event_type == EventType.BLACKLIST_APP_DETECTED.value:
                severity = AlertSeverity.WARNING.value
                title = f"Mở ứng dụng bị cấm: {app_name}"
                description = details or f"Thiết bị {dev.device_name or dev.device_id} đã mở ứng dụng giải trí/bị chặn ({pkg_name})."
                if dev.status != DeviceStatus.CRITICAL.value:
                    dev.status = DeviceStatus.WARNING.value
            else:
                severity = AlertSeverity.WARNING.value
                title = f"Sự kiện cảnh báo: {event_type}"
                description = details or f"Phát hiện sự kiện {event_type} trên thiết bị {dev.device_name or dev.device_id}."
                if dev.status not in (DeviceStatus.CRITICAL.value, DeviceStatus.WARNING.value):
                    dev.status = DeviceStatus.WARNING.value

            new_alert = Alert(
                id=uuid.uuid4(),
                alert_code=event_type,
                title=title,
                description=description,
                severity=severity,
                status=AlertStatus.NEW.value,
                event_data=payload,
                device_id=dev.id,
                school_id=dev.school_id,
                campus_id=dev.campus_id,
                classroom_id=dev.classroom_id,
                event_id=dev_event.id,
            )
            db.add(new_alert)
            await db.commit()
            await db.refresh(new_alert)

            alert_dto = _map_to_dto(new_alert).model_dump(mode="json", by_alias=True)
            await notifier.broadcast_new_alert(alert_dto, campus_id=dev.campus_id)
            await notifier.broadcast_device_status(device_id, dev.status, campus_id=dev.campus_id)

        except Exception as e:
            logger.error("Failed to process event from device %s: %s", device_id, e)
            await db.rollback()


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
            await notifier.broadcast_command_ack(device_id, str(command_id), new_status, error_message)

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

    # 2. Chấp nhận kết nối → lưu vào ConnectionManager kèm Campus Scope
    dev_campus_id = str(device.campus_id) if device.campus_id else None
    await manager.agent_connect(device_id, websocket, campus_id=dev_campus_id)

    # 3. Cập nhật trạng thái ONLINE trong DB
    await _update_device_status(device_id, DeviceStatus.ONLINE)

    # 4. Broadcast ONLINE cho Dashboard thuộc Campus quản lý
    await notifier.broadcast_device_status(device_id, "ONLINE", campus_id=dev_campus_id)

    # 5. Gửi xuống Agent các lệnh đang PENDING và chính sách Rule đang active
    await _send_pending_commands(device_id, websocket)
    await _send_active_policies(device_id, websocket)

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
            active_campus = (
                manager.get_device_campus(device_id)
                if device_id in manager.agent_campuses
                else dev_campus_id
            )

            if msg_type == "METRICS":
                # 1. Cập nhật in-memory cache → real-time cho Dashboard
                manager.update_metrics(device_id, msg_data)
                await notifier.broadcast_device_metrics(device_id, msg_data, campus_id=active_campus)

                # 2. Cập nhật last_heartbeat_at định kỳ khi nhận metrics
                await _touch_device_heartbeat(device_id)

                # 3. Lưu DB định kỳ (mỗi METRICS_SAVE_EVERY lần = ~5 phút, và ngay lần đầu tiên)
                #    Chạy dưới dạng background task để không block vòng lặp WS
                if MetricsPersistenceService.should_save(device_id):
                    asyncio.create_task(
                        MetricsPersistenceService.save_snapshot(device_id, msg_data)
                    )

            elif msg_type == "CURRENT_APP":
                manager.update_current_app(device_id, msg_data)
                await notifier.broadcast_current_app(device_id, msg_data, campus_id=active_campus)

            elif msg_type == "SCREEN_FRAME":
                await notifier.broadcast_screen_frame(
                    device_id,
                    msg_data.get("frame", ""),
                    campus_id=active_campus,
                )

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
        # 7. Chỉ dọn kết nối & mark OFFLINE nếu đây vẫn là socket đang active (tránh WS cũ đá WS mới)
        final_campus = (
            manager.get_device_campus(device_id)
            if device_id in manager.agent_campuses
            else dev_campus_id
        )
        if manager.agent_disconnect(device_id, websocket=websocket):
            # 8. Xoá counter metrics của device này (giải phóng bộ nhớ)
            MetricsPersistenceService.reset_counter(device_id)

            # 9. Cập nhật OFFLINE trong DB
            await _update_device_status(device_id, DeviceStatus.OFFLINE)

            # 10. Broadcast OFFLINE cho Dashboard thuộc Campus
            await notifier.broadcast_device_status(device_id, "OFFLINE", campus_id=final_campus)
