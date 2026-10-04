"""
Dashboard WebSocket Endpoint — Kênh real-time cho Web Admin.

Admin kết nối vào đây để nhận:
  - Trạng thái thiết bị thay đổi (ONLINE/OFFLINE/WARNING/CRITICAL)
  - Metrics real-time (RAM, CPU, pin, wifi)
  - Alert mới
  - Kết quả thực thi lệnh
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.db.session import async_session_factory
from app.core.dependencies import get_user_from_ws_token
from app.ws.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket - Dashboard"])


@router.websocket("/ws/dashboard")
async def dashboard_websocket_endpoint(
    websocket: WebSocket,
) -> None:
    """
    WebSocket endpoint cho Web Dashboard Admin.

    URL: ws://<host>/api/ws/dashboard?token=<user_jwt>

    Server sẽ push các events:
      {"type": "DEVICE_STATUS",       "data": { deviceId, status }}
      {"type": "DEVICE_METRICS",      "data": { deviceId, metrics: {...} }}
      {"type": "DEVICE_CURRENT_APP",  "data": { deviceId, currentApp: {...} }}
      {"type": "NEW_ALERT",           "data": { id, title, severity, ... }}
      {"type": "ALERT_STATUS_CHANGED","data": { alertId, ... }}
    """
    # 1. Xác thực JWT
    token = websocket.query_params.get("token")

    async with async_session_factory() as auth_db:
        user = await get_user_from_ws_token(token, auth_db)

    if not user:
        logger.warning("Rejected Dashboard WS connection: invalid token")
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = str(user.id)

    # 2. Chấp nhận kết nối
    await manager.dashboard_connect(user_id, websocket)

    # 3. Gửi snapshot trạng thái ban đầu (danh sách device đang ONLINE)
    online_devices = manager.get_online_device_ids()
    try:
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "data": {
                "onlineDeviceIds": online_devices,
                "stats": manager.get_connection_stats(),
            },
        })
    except Exception:
        pass

    try:
        # 4. Giữ kết nối mở — Dashboard chủ yếu nhận, không gửi nhiều
        while True:
            try:
                data = await websocket.receive_json()
                # Dashboard có thể gửi ping/pong để giữ kết nối
                if data.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except WebSocketDisconnect:
                raise
            except Exception as e:
                logger.warning(f"WS receive error: {e}")
                break

    except WebSocketDisconnect:
        logger.info("Dashboard disconnected: user_id=%s", user_id)

    except Exception as e:
        logger.error("Dashboard WS error for user %s: %s", user_id, e)

    finally:
        manager.dashboard_disconnect(user_id)
