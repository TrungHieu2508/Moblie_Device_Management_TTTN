"""
Notifier — Broadcast events từ Server đến Dashboard và Device.

Thay thế hoàn toàn WebSocketNotificationService.java.
Thay thế SimpMessagingTemplate (STOMP) bằng Pure WebSocket JSON.

Tất cả message có cấu trúc:
{
  "type": "DEVICE_STATUS" | "DEVICE_METRICS" | "NEW_ALERT" | "COMMAND" | ...,
  "data": { ... }
}
"""

import logging
from typing import Any, Optional

from app.ws.connection_manager import manager

logger = logging.getLogger(__name__)

_UNSET = object()


class Notifier:
    """
    Tập trung tất cả broadcast logic theo Campus Scope.
    Tương đương WebSocketNotificationService.java.
    """

    @staticmethod
    def _resolve_device_scope(device_id: str, campus_id: Any) -> tuple[Optional[str], bool]:
        if campus_id is not _UNSET:
            return (str(campus_id) if campus_id else None, True)
        if device_id in manager.agent_campuses:
            return (manager.agent_campuses.get(device_id), True)
        return (None, False)

    # ── Device Status ─────────────────────────────────────────

    async def broadcast_device_status(
        self,
        device_id: str,
        status: str,
        extra: Optional[dict] = None,
        campus_id: Any = _UNSET,
    ) -> None:
        """
        Thông báo trạng thái thiết bị thay đổi tới Dashboard thuộc phạm vi quản lý.
        status: "ONLINE" | "OFFLINE" | "WARNING" | "CRITICAL"
        """
        payload = {
            "type": "DEVICE_STATUS",
            "data": {
                "deviceId": device_id,
                "status": status,
            },
        }
        if extra:
            payload["data"].update(extra)

        target_campus, scoped = self._resolve_device_scope(device_id, campus_id)
        await manager.broadcast_to_dashboards(payload, campus_id=target_campus, scoped=scoped)
        logger.debug("Broadcasted status=%s for device=%s", status, device_id)

    # ── Device Metrics ────────────────────────────────────────

    async def broadcast_device_metrics(
        self,
        device_id: str,
        metrics: dict,
        campus_id: Any = _UNSET,
    ) -> None:
        """Phát sóng metrics real-time lên Dashboard thuộc phạm vi Campus."""
        payload = {
            "type": "DEVICE_METRICS",
            "data": {
                "deviceId": device_id,
                "metrics": metrics,
            },
        }
        target_campus, scoped = self._resolve_device_scope(device_id, campus_id)
        await manager.broadcast_to_dashboards(payload, campus_id=target_campus, scoped=scoped)

    # ── Current App & Screen Stream ───────────────────────────

    async def broadcast_current_app(
        self,
        device_id: str,
        current_app: dict,
        campus_id: Any = _UNSET,
    ) -> None:
        """Thông báo app đang mở trên thiết bị tới Dashboard thuộc phạm vi Campus."""
        payload = {
            "type": "DEVICE_CURRENT_APP",
            "data": {
                "deviceId": device_id,
                "currentApp": current_app,
            },
        }
        target_campus, scoped = self._resolve_device_scope(device_id, campus_id)
        await manager.broadcast_to_dashboards(payload, campus_id=target_campus, scoped=scoped)

    async def broadcast_screen_frame(
        self,
        device_id: str,
        frame: str,
        campus_id: Any = _UNSET,
    ) -> None:
        """Phát sóng khung hình màn hình trực tiếp (Base64 JPEG) lên Dashboard cùng Campus."""
        if not frame:
            return
        payload = {
            "type": "SCREEN_FRAME",
            "data": {
                "deviceId": device_id,
                "frame": frame,
            },
        }
        target_campus, scoped = self._resolve_device_scope(device_id, campus_id)
        await manager.broadcast_to_dashboards(payload, campus_id=target_campus, scoped=scoped)

    # ── Alert ────────────────────────────────────────────────

    async def broadcast_new_alert(
        self,
        alert: dict,
        campus_id: Any = _UNSET,
    ) -> None:
        """Phát sóng alert mới tới Dashboard cùng Campus (và Super Admin)."""
        payload = {
            "type": "NEW_ALERT",
            "data": alert,
        }
        resolved = campus_id if campus_id is not _UNSET else (alert.get("campusId") or alert.get("campus_id"))
        scoped = (campus_id is not _UNSET) or ("campusId" in alert) or ("campus_id" in alert)
        await manager.broadcast_to_dashboards(
            payload,
            campus_id=str(resolved) if resolved else None,
            scoped=scoped,
        )
        logger.info("Broadcasted new alert: %s", alert.get("title", ""))

    async def broadcast_alert_status_change(
        self,
        alert_id: str,
        alert: dict,
        campus_id: Any = _UNSET,
    ) -> None:
        """Thông báo alert đã được cập nhật tới Dashboard cùng Campus."""
        payload = {
            "type": "ALERT_STATUS_CHANGED",
            "data": {
                "alertId": alert_id,
                **alert,
            },
        }
        resolved = campus_id if campus_id is not _UNSET else (alert.get("campusId") or alert.get("campus_id"))
        scoped = (campus_id is not _UNSET) or ("campusId" in alert) or ("campus_id" in alert)
        await manager.broadcast_to_dashboards(
            payload,
            campus_id=str(resolved) if resolved else None,
            scoped=scoped,
        )

    # ── Command ───────────────────────────────────────────────

    async def send_command_to_device(self, device_id: str, command: dict) -> bool:
        """
        Gửi lệnh TRỰC TIẾP xuống device qua WebSocket.

        Thay thế hoàn toàn:
          - CommandQueueService.enqueueCommand() (Redis queue)
          - SimpMessagingTemplate.convertAndSend("/topic/devices/{id}/command")

        Returns:
            True  → Device ONLINE, lệnh đã gửi thành công
            False → Device OFFLINE, lệnh ở trạng thái PENDING trong DB
        """
        message = {
            "type": "COMMAND",
            "data": command,
        }
        sent = await manager.send_to_agent(device_id, message)

        if sent:
            logger.info("Command sent via WebSocket to device=%s, type=%s",
                        device_id, command.get("commandType"))
        else:
            logger.info("Device=%s offline, command kept PENDING in DB", device_id)

        return sent

    async def broadcast_command_ack(
        self,
        device_id: str,
        command_id: str,
        status: str,
        error_message: Optional[str] = None,
        campus_id: Any = _UNSET,
    ) -> None:
        """Thông báo trạng thái thực thi lệnh (COMMAND_ACK) lên Dashboard cùng Campus."""
        payload = {
            "type": "COMMAND_ACK",
            "data": {
                "deviceId": device_id,
                "commandId": command_id,
                "status": status,
                "errorMessage": error_message,
            },
        }
        target_campus, scoped = self._resolve_device_scope(device_id, campus_id)
        await manager.broadcast_to_dashboards(payload, campus_id=target_campus, scoped=scoped)


# ── Singleton Instance ────────────────────────────────────────
notifier = Notifier()
