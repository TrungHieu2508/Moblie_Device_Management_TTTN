"""
ConnectionManager — Trung tâm quản lý tất cả WebSocket connections.

Thay thế hoàn toàn:
  - Redis key "device:{id}:status" (TTL 90s)
  - Redis key "device:{id}:metrics"
  - Redis key "device:{id}:currentApp"
  - Redis key "device:{id}:commands:pending" (queue)
  - OfflineDetectionJob.java (@Scheduled mỗi 60s)

Phương án B: Trạng thái ONLINE/OFFLINE được xác định bởi
WebSocket session còn tồn tại hay không, không phải Redis TTL.
"""

import asyncio
import logging
from typing import Dict, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Singleton quản lý toàn bộ WebSocket connections.

    agent_connections    : {device_id → WebSocket}   ← Android Agent kết nối
    dashboard_connections: {user_id   → WebSocket}   ← Web Dashboard Admin kết nối
    device_metrics       : {device_id → dict}         ← Cache metrics (thay Redis)
    device_current_app   : {device_id → dict}         ← Cache app đang mở (thay Redis)
    """

    def __init__(self):
        # ── Agent connections ─────────────────────────────────
        self.agent_connections: Dict[str, WebSocket] = {}

        # ── Dashboard connections ─────────────────────────────
        self.dashboard_connections: Dict[str, WebSocket] = {}

        # ── In-memory cache (thay Redis) ──────────────────────
        self.device_metrics: Dict[str, dict] = {}
        self.device_current_app: Dict[str, dict] = {}

    # ═════════════════════════════════════════════════════════
    # AGENT LIFECYCLE
    # ═════════════════════════════════════════════════════════

    async def agent_connect(self, device_id: str, websocket: WebSocket) -> None:
        """
        Agent mở WebSocket connection.
        Chấp nhận kết nối, lưu vào dict.
        DB update status=ONLINE được thực hiện trong agent_ws.py.
        """
        await websocket.accept()
        self.agent_connections[device_id] = websocket
        logger.info("✅ Agent connected: device_id=%s | total_agents=%d",
                    device_id, len(self.agent_connections))

    def agent_disconnect(self, device_id: str) -> None:
        """
        Agent đóng kết nối (bất kỳ lý do: tắt máy, mất mạng, v.v.).
        Xóa khỏi dict và xóa cache metrics.
        DB update status=OFFLINE được thực hiện trong agent_ws.py.
        """
        self.agent_connections.pop(device_id, None)
        self.device_metrics.pop(device_id, None)
        self.device_current_app.pop(device_id, None)
        logger.info("❌ Agent disconnected: device_id=%s | total_agents=%d",
                    device_id, len(self.agent_connections))

    def is_device_online(self, device_id: str) -> bool:
        """Kiểm tra device có đang kết nối WebSocket không."""
        return device_id in self.agent_connections

    # ═════════════════════════════════════════════════════════
    # DASHBOARD LIFECYCLE
    # ═════════════════════════════════════════════════════════

    async def dashboard_connect(self, user_id: str, websocket: WebSocket) -> None:
        """Admin mở Dashboard WebSocket."""
        await websocket.accept()
        self.dashboard_connections[user_id] = websocket
        logger.info("📊 Dashboard connected: user_id=%s | total_dashboards=%d",
                    user_id, len(self.dashboard_connections))

    def dashboard_disconnect(self, user_id: str) -> None:
        """Admin đóng Dashboard."""
        self.dashboard_connections.pop(user_id, None)
        logger.info("📊 Dashboard disconnected: user_id=%s", user_id)

    # ═════════════════════════════════════════════════════════
    # SEND TO AGENT (Server → Device)
    # ═════════════════════════════════════════════════════════

    async def send_to_agent(self, device_id: str, message: dict) -> bool:
        """
        Gửi message xuống Agent qua WebSocket.
        Tương đương WebSocketNotificationService.sendCommandToDevice().

        Returns:
            True  → Gửi thành công (device đang ONLINE)
            False → Device không tồn tại trong dict (OFFLINE)
        """
        ws = self.agent_connections.get(device_id)
        if not ws:
            logger.debug("Device %s is offline, cannot send message", device_id)
            return False

        try:
            await ws.send_json(message)
            return True
        except Exception as e:
            logger.warning("Failed to send to device %s: %s", device_id, e)
            # Kết nối bị đứt ngầm → dọn dẹp
            self.agent_disconnect(device_id)
            return False

    # ═════════════════════════════════════════════════════════
    # BROADCAST TO ALL DASHBOARDS (Server → All Admins)
    # ═════════════════════════════════════════════════════════

    async def broadcast_to_dashboards(self, message: dict) -> None:
        """
        Phát sóng message đến tất cả Dashboard đang kết nối.
        Tương đương WebSocketNotificationService methods dùng SimpMessagingTemplate.

        Tự động dọn dẹp connections bị lỗi.
        """
        disconnected_users = []

        for user_id, ws in list(self.dashboard_connections.items()):
            try:
                await ws.send_json(message)
            except Exception:
                disconnected_users.append(user_id)

        for uid in disconnected_users:
            self.dashboard_disconnect(uid)

    # ═════════════════════════════════════════════════════════
    # IN-MEMORY CACHE (Thay Redis)
    # ═════════════════════════════════════════════════════════

    def update_metrics(self, device_id: str, metrics: dict) -> None:
        """Cập nhật metrics mới nhất vào memory (thay Redis key metrics)."""
        self.device_metrics[device_id] = metrics

    def get_metrics(self, device_id: str) -> Optional[dict]:
        """Lấy metrics từ memory cache."""
        return self.device_metrics.get(device_id)

    def update_current_app(self, device_id: str, app: dict) -> None:
        """Cập nhật app đang mở vào memory (thay Redis key currentApp)."""
        self.device_current_app[device_id] = app

    def get_current_app(self, device_id: str) -> Optional[dict]:
        """Lấy app đang mở từ memory cache."""
        return self.device_current_app.get(device_id)

    # ═════════════════════════════════════════════════════════
    # STATUS / STATS
    # ═════════════════════════════════════════════════════════

    def get_online_device_ids(self) -> list[str]:
        """Danh sách device_id đang ONLINE."""
        return list(self.agent_connections.keys())

    def get_connection_stats(self) -> dict:
        """Thống kê kết nối hiện tại."""
        return {
            "online_agents": len(self.agent_connections),
            "online_dashboards": len(self.dashboard_connections),
        }


# ── Singleton Instance ────────────────────────────────────────
# Import từ bất kỳ file nào: from app.ws.connection_manager import manager
manager = ConnectionManager()
