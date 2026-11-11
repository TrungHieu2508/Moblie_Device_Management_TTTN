"""
Nhóm 04: Kiểm thử Điều khiển Thiết bị Từ xa (Khóa màn hình, Mở khóa, Còi báo động, Dọn RAM)
& Phát trực tiếp màn hình Live Stream qua WebSocket ConnectionManager (TC31 -> TC42).
"""

from app.ws.connection_manager import manager


class DummyWebSocket:
    """Mock WebSocket dùng để kiểm thử luồng đẩy lệnh và phát trực tiếp màn hình."""

    def __init__(self):
        self.accepted = False
        self.sent_messages = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, message: dict):
        self.sent_messages.append(message)


async def _get_primary_device_uuid(client, teacher_headers) -> str:
    res = await client.get("/api/devices?search=R58M3575BAK", headers=teacher_headers)
    return res.json()["data"][0]["id"]


async def test_tc31_lock_screen_command_queued_when_device_offline(client, teacher_headers):
    """TC31: Khi máy học sinh đang OFFLINE, lệnh LOCK_SCREEN được lưu vào hàng đợi DB với trạng thái PENDING."""
    manager.agent_disconnect("R58M3575BAK")
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)

    res = await client.post(
        f"/api/devices/{device_uuid}/commands",
        headers=teacher_headers,
        json={
            "commandType": "LOCK_SCREEN",
            "payload": {"message": "Khóa màn hình khi máy đang offline"},
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["commandType"] == "LOCK_SCREEN"
    assert data["status"] == "PENDING"


async def test_tc32_lock_screen_command_dispatched_immediately_when_online(client, teacher_headers):
    """TC32: Khi máy học sinh đang ONLINE qua WebSocket, lệnh LOCK_SCREEN được đẩy xuống ngay lập tức (SENT)."""
    dummy_ws = DummyWebSocket()
    await manager.agent_connect("R58M3575BAK", dummy_ws)
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)

    res = await client.post(
        f"/api/devices/{device_uuid}/commands",
        headers=teacher_headers,
        json={
            "commandType": "LOCK_SCREEN",
            "payload": {"message": "Giáo viên đã khóa màn hình thiết bị của bạn!"},
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["commandType"] == "LOCK_SCREEN"
    assert data["status"] == "SENT"
    assert len(dummy_ws.sent_messages) == 1
    assert dummy_ws.sent_messages[0]["type"] == "COMMAND"
    assert dummy_ws.sent_messages[0]["data"]["commandType"] == "LOCK_SCREEN"


async def test_tc33_teacher_send_unlock_device_command(client, teacher_headers):
    """TC33: Giáo viên gửi lệnh Mở khóa màn hình (UNLOCK_DEVICE) xuống máy học sinh."""
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)
    res = await client.post(
        f"/api/devices/{device_uuid}/commands",
        headers=teacher_headers,
        json={"commandType": "UNLOCK_DEVICE", "payload": {}},
    )
    assert res.status_code == 200
    assert res.json()["data"]["commandType"] == "UNLOCK_DEVICE"
    assert res.json()["data"]["status"] == "SENT"


async def test_tc34_teacher_send_start_stream_live_screen_command(client, teacher_headers):
    """TC34: Giáo viên bấm 'Xem màn hình' gửi lệnh START_STREAM để bắt đầu phát trực tiếp màn hình."""
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)
    res = await client.post(
        f"/api/devices/{device_uuid}/commands",
        headers=teacher_headers,
        json={"commandType": "START_STREAM", "payload": {}},
    )
    assert res.status_code == 200
    assert res.json()["data"]["commandType"] == "START_STREAM"
    assert res.json()["data"]["status"] == "SENT"


async def test_tc35_teacher_send_stop_stream_live_screen_command(client, teacher_headers):
    """TC35: Giáo viên bấm 'Dừng xem màn hình' gửi lệnh STOP_STREAM xuống thiết bị."""
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)
    res = await client.post(
        f"/api/devices/{device_uuid}/commands",
        headers=teacher_headers,
        json={"commandType": "STOP_STREAM", "payload": {}},
    )
    assert res.status_code == 200
    assert res.json()["data"]["commandType"] == "STOP_STREAM"
    assert res.json()["data"]["status"] == "SENT"


async def test_tc36_teacher_send_show_alert_message_command(client, teacher_headers):
    """TC36: Giáo viên gửi thông báo nhắc nhở (SHOW_ALERT) hiển thị trực tiếp lên màn hình học sinh."""
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)
    res = await client.post(
        f"/api/devices/{device_uuid}/commands",
        headers=teacher_headers,
        json={
            "commandType": "SHOW_ALERT",
            "payload": {"message": "Em vui lòng tập trung vào bài giảng Toán!"},
        },
    )
    assert res.status_code == 200
    assert res.json()["data"]["commandType"] == "SHOW_ALERT"
    assert res.json()["data"]["status"] == "SENT"


async def test_tc37_teacher_send_ring_alarm_siren_command(client, teacher_headers):
    """TC37: Giáo viên kích hoạt Còi báo động (RING_ALARM) trên điện thoại học sinh."""
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)
    res = await client.post(
        f"/api/devices/{device_uuid}/commands",
        headers=teacher_headers,
        json={"commandType": "RING_ALARM", "payload": {}},
    )
    assert res.status_code == 200
    assert res.json()["data"]["commandType"] == "RING_ALARM"
    assert res.json()["data"]["status"] == "SENT"


async def test_tc38_teacher_send_clear_background_apps_ram_command(client, teacher_headers):
    """TC38: Giáo viên gửi lệnh Dọn RAM & Đóng ứng dụng chạy ngầm (CLEAR_BACKGROUND_APPS)."""
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)
    res = await client.post(
        f"/api/devices/{device_uuid}/commands",
        headers=teacher_headers,
        json={"commandType": "CLEAR_BACKGROUND_APPS", "payload": {}},
    )
    assert res.status_code == 200
    assert res.json()["data"]["commandType"] == "CLEAR_BACKGROUND_APPS"
    assert res.json()["data"]["status"] == "SENT"


async def test_tc39_teacher_view_device_command_history(client, teacher_headers):
    """TC39: Giáo viên xem lịch sử các lệnh điều khiển đã gửi tới thiết bị (GET /api/devices/{uuid}/commands)."""
    device_uuid = await _get_primary_device_uuid(client, teacher_headers)
    res = await client.get(
        f"/api/devices/{device_uuid}/commands?page=1&size=20",
        headers=teacher_headers,
    )
    assert res.status_code == 200
    items = res.json()["data"]
    assert isinstance(items, list)
    assert len(items) >= 7
    cmd_types = [c["commandType"] for c in items]
    assert "LOCK_SCREEN" in cmd_types
    assert "START_STREAM" in cmd_types


async def test_tc40_realtime_metrics_and_current_app_in_memory_cache(client, teacher_headers):
    """TC40: Kiểm tra bộ nhớ đệm In-Memory (Phương án B) lưu trữ Pin, RAM và Ứng dụng học sinh đang mở."""
    manager.update_metrics(
        "R58M3575BAK",
        {
            "batteryLevel": 88,
            "ramUsage": 62,
            "storageUsage": 45,
            "wifiSsid": "UTH_Student_WiFi",
        },
    )
    manager.update_current_app(
        "R58M3575BAK",
        {"packageName": "com.google.android.apps.classroom", "appName": "Google Classroom"},
    )

    device_uuid = await _get_primary_device_uuid(client, teacher_headers)
    metrics_res = await client.get(
        f"/api/devices/{device_uuid}/metrics",
        headers=teacher_headers,
    )
    assert metrics_res.status_code == 200
    m_data = metrics_res.json()["data"]
    assert m_data["batteryLevel"] == 88

    dev_res = await client.get(f"/api/devices/{device_uuid}", headers=teacher_headers)
    assert dev_res.status_code == 200
    assert dev_res.json()["data"]["currentApp"]["appName"] == "Google Classroom"


async def test_tc41_realtime_screen_frame_broadcast_to_teacher_dashboard():
    """TC41: Kiểm tra luồng phát trực tiếp khung hình SCREEN_FRAME từ máy học sinh lên màn hình Giáo viên."""
    teacher_ws = DummyWebSocket()
    await manager.dashboard_connect("cccccccc-cccc-cccc-cccc-cccccccccccc", teacher_ws)

    fake_jpeg_base64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/"
    await manager.broadcast_to_dashboards(
        {
            "type": "SCREEN_FRAME",
            "data": {"deviceId": "R58M3575BAK", "frame": fake_jpeg_base64},
        }
    )

    assert len(teacher_ws.sent_messages) == 1
    msg = teacher_ws.sent_messages[0]
    assert msg["type"] == "SCREEN_FRAME"
    assert msg["data"]["deviceId"] == "R58M3575BAK"
    assert msg["data"]["frame"] == fake_jpeg_base64
    manager.dashboard_disconnect("cccccccc-cccc-cccc-cccc-cccccccccccc")


async def test_tc42_agent_disconnect_cleans_up_online_state_and_cache():
    """TC42: Khi điện thoại học sinh ngắt kết nối WebSocket, trạng thái ONLINE và cache được giải phóng sạch sẽ."""
    await manager.agent_connect("R58M3575BAK", DummyWebSocket())
    manager.update_metrics("R58M3575BAK", {"batteryLevel": 90})
    manager.update_current_app("R58M3575BAK", {"appName": "Calculator"})
    assert manager.is_device_online("R58M3575BAK") is True

    manager.agent_disconnect("R58M3575BAK")
    assert manager.is_device_online("R58M3575BAK") is False
    assert manager.get_metrics("R58M3575BAK") is None
    assert manager.get_current_app("R58M3575BAK") is None
