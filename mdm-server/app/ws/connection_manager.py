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
from typing import Any, Dict, List, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

_UNSET = object()


class ConnectionManager:
    """
    Singleton quản lý toàn bộ WebSocket connections.

    agent_connections    : {device_id → WebSocket}         ← Android Agent kết nối
    agent_campuses       : {device_id → campus_id | None}  ← Campus cache phục vụ phân luồng WS
    dashboard_connections: {user_id   → [WebSocket, ...]}  ← Cho phép 1 Admin mở nhiều tab Dashboard
    dashboard_scopes     : {id(ws)    → (role, campus_id)} ← Phân quyền nhận event theo Campus
    device_metrics       : {device_id → dict}              ← Cache metrics (thay Redis)
    device_current_app   : {device_id → dict}              ← Cache app đang mở (thay Redis)
    """

    def __init__(self):
        # ── Agent connections ─────────────────────────────────
        self.agent_connections: Dict[str, WebSocket] = {}
        self.agent_campuses: Dict[str, Optional[str]] = {}

        # ── Dashboard connections (hỗ trợ nhiều tab/user) ────
        self.dashboard_connections: Dict[str, List[WebSocket]] = {}
        self.dashboard_scopes: Dict[int, tuple[Optional[str], Optional[str]]] = {}

        # ── In-memory cache (thay Redis) ──────────────────────
        self.device_metrics: Dict[str, dict] = {}
        self.device_current_app: Dict[str, dict] = {}

    # ═════════════════════════════════════════════════════════
    # AGENT LIFECYCLE
    # ═════════════════════════════════════════════════════════

    async def agent_connect(
        self,
        device_id: str,
        websocket: WebSocket,
        campus_id: Any = _UNSET,
    ) -> None:
        """
        Agent mở WebSocket connection.
        Chấp nhận kết nối, lưu vào dict.
        DB update status=ONLINE được thực hiện trong agent_ws.py.
        """
        await websocket.accept()
        self.agent_connections[device_id] = websocket
        if campus_id is not _UNSET:
            self.agent_campuses[device_id] = str(campus_id) if campus_id else None
        logger.info("✅ Agent connected: device_id=%s | total_agents=%d",
                    device_id, len(self.agent_connections))

    def set_device_campus(self, device_id: str, campus_id: Optional[Any]) -> None:
        """Cập nhật cached campus_id khi thiết bị được gán hoặc điều chuyển Campus."""
        if device_id in self.agent_connections or device_id in self.agent_campuses:
            self.agent_campuses[device_id] = str(campus_id) if campus_id else None

    def get_device_campus(self, device_id: str) -> Optional[str]:
        """Lấy cached campus_id của Agent đang kết nối."""
        return self.agent_campuses.get(device_id)

    def agent_disconnect(self, device_id: str, websocket: Optional[WebSocket] = None) -> bool:
        """
        Agent đóng kết nối (bất kỳ lý do: tắt máy, mất mạng, v.v.).
        Nếu truyền `websocket` và kết nối hiện tại đã được thay bởi socket mới hơn -> bỏ qua.
        Trả về True nếu đã dọn kết nối hiện hành, False nếu kết nối đã bị thay thế.
        """
        if websocket is not None:
            current = self.agent_connections.get(device_id)
            if current is not websocket:
                logger.info(
                    "⏭️ Skip stale agent disconnect for device_id=%s (newer WS already active)",
                    device_id,
                )
                return False

        self.agent_connections.pop(device_id, None)
        self.agent_campuses.pop(device_id, None)
        self.device_metrics.pop(device_id, None)
        self.device_current_app.pop(device_id, None)
        logger.info("❌ Agent disconnected: device_id=%s | total_agents=%d",
                    device_id, len(self.agent_connections))
        return True

    def is_device_online(self, device_id: str) -> bool:
        """Kiểm tra device có đang kết nối WebSocket không."""
        return device_id in self.agent_connections

    # ═════════════════════════════════════════════════════════
    # DASHBOARD LIFECYCLE
    # ═════════════════════════════════════════════════════════

    async def dashboard_connect(
        self,
        user_id: str,
        websocket: WebSocket,
        role: Optional[str] = None,
        campus_id: Optional[Any] = None,
    ) -> None:
        """Admin mở Dashboard WebSocket (hỗ trợ nhiều tab đồng thời cùng tài khoản)."""
        await websocket.accept()
        conns = self.dashboard_connections.setdefault(user_id, [])
        if websocket not in conns:
            conns.append(websocket)
        self.dashboard_scopes[id(websocket)] = (
            role.upper() if role else None,
            str(campus_id) if campus_id else None,
        )
        logger.info(
            "📊 Dashboard connected: user_id=%s | total_dashboards=%d",
            user_id,
            sum(len(c) for c in self.dashboard_connections.values()),
        )

    def dashboard_disconnect(
        self,
        user_id: str,
        websocket: Optional[WebSocket] = None,
    ) -> None:
        """Admin đóng một tab Dashboard (hoặc toàn bộ nếu không truyền websocket)."""
        if websocket is None:
            conns = self.dashboard_connections.pop(user_id, [])
            for ws in conns:
                self.dashboard_scopes.pop(id(ws), None)
        else:
            conns = self.dashboard_connections.get(user_id)
            if conns is not None:
                if websocket in conns:
                    conns.remove(websocket)
                if not conns:
                    self.dashboard_connections.pop(user_id, None)
            self.dashboard_scopes.pop(id(websocket), None)
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

    def _should_deliver_to_socket(
        self,
        websocket: WebSocket,
        campus_id: Optional[str],
        scoped: bool,
    ) -> bool:
        """Kiểm tra quyền nhận broadcast của một tab Dashboard theo Campus Scope."""
        if not scoped:
            return True
        role, user_campus_id = self.dashboard_scopes.get(id(websocket), (None, None))
        if role == "SUPER_ADMIN":
            return True
        if role in ("IT_ADMIN", "ADMIN"):
            return bool(campus_id and user_campus_id and str(campus_id) == str(user_campus_id))
        return True

    async def broadcast_to_dashboards(
        self,
        message: dict,
        campus_id: Optional[Any] = None,
        scoped: bool = False,
    ) -> None:
        """
        Phát sóng message đến Dashboard đang kết nối (lọc theo Campus nếu scoped=True).
        Tự động dọn dẹp connections bị lỗi theo từng tab riêng biệt.
        """
        disconnected: list[tuple[str, WebSocket]] = []
        target_campus = str(campus_id) if campus_id else None

        for user_id, conns in list(self.dashboard_connections.items()):
            for ws in list(conns):
                if not self._should_deliver_to_socket(ws, target_campus, scoped):
                    continue
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append((user_id, ws))

        for uid, ws in disconnected:
            self.dashboard_disconnect(uid, ws)

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
            "online_dashboards": sum(len(conns) for conns in self.dashboard_connections.values()),
        }


# ── Singleton Instance ────────────────────────────────────────
# Import từ bất kỳ file nào: from app.ws.connection_manager import manager
manager = ConnectionManager()
