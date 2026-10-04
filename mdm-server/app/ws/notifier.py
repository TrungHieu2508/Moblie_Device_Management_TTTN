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
from typing import Optional

from app.ws.connection_manager import manager

logger = logging.getLogger(__name__)


class Notifier:
    """
    Tập trung tất cả broadcast logic.
    Tương đương WebSocketNotificationService.java.
    """

    # ── Device Status ─────────────────────────────────────────

    async def broadcast_device_status(
        self,
        device_id: str,
        status: str,
        extra: Optional[dict] = None,
    ) -> None:
        """
        Thông báo trạng thái thiết bị thay đổi tới tất cả Dashboard.
        Tương đương notifyDeviceStatusChange().

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

        await manager.broadcast_to_dashboards(payload)
        logger.debug("Broadcasted status=%s for device=%s", status, device_id)

    # ── Device Metrics ────────────────────────────────────────

    async def broadcast_device_metrics(self, device_id: str, metrics: dict) -> None:
        """
        Phát sóng metrics real-time lên Dashboard.
        Tương đương broadcastDeviceMetrics().

        Dashboard dùng để cập nhật biểu đồ RAM, CPU, Pin mà không cần F5.
        """
        payload = {
            "type": "DEVICE_METRICS",
            "data": {
                "deviceId": device_id,
                "metrics": metrics,
            },
        }
        await manager.broadcast_to_dashboards(payload)

    # ── Current App ───────────────────────────────────────────

    async def broadcast_current_app(self, device_id: str, current_app: dict) -> None:
        """Thông báo app đang mở trên thiết bị."""
        payload = {
            "type": "DEVICE_CURRENT_APP",
            "data": {
                "deviceId": device_id,
                "currentApp": current_app,
            },
        }
        await manager.broadcast_to_dashboards(payload)

    # ── Alert ────────────────────────────────────────────────

    async def broadcast_new_alert(self, alert: dict) -> None:
        """
        Phát sóng alert mới tới tất cả Dashboard.
        Tương đương broadcastNewAlert().
        """
        payload = {
            "type": "NEW_ALERT",
            "data": alert,
        }
        await manager.broadcast_to_dashboards(payload)
        logger.info("Broadcasted new alert: %s", alert.get("title", ""))

    async def broadcast_alert_status_change(self, alert_id: str, alert: dict) -> None:
        """
        Thông báo alert đã được cập nhật (RESOLVED, DISMISSED).
        Tương đương broadcastAlertStatusChange().
        """
        payload = {
            "type": "ALERT_STATUS_CHANGED",
            "data": {
                "alertId": alert_id,
                **alert,
            },
        }
        await manager.broadcast_to_dashboards(payload)

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


# ── Singleton Instance ────────────────────────────────────────
notifier = Notifier()
