"""
Nhóm 05: Kiểm thử Cảnh báo Vi phạm Ứng dụng Mạng xã hội/Game, Thống kê Dashboard & Đăng xuất (TC43 -> TC50).
"""

import uuid
from app.models.alert import Alert
from app.models.enums import AlertSeverity, AlertStatus


async def test_tc43_create_social_media_violation_alert_and_list(client, it_admin_headers, db_session):
    """TC43: Khi học sinh mở ứng dụng Mạng xã hội bị cấm (Facebook/TikTok), Cảnh báo hiển thị trên trang Admin."""
    list_res = await client.get("/api/devices?search=R58M3575BAK", headers=it_admin_headers)
    device_uuid = uuid.UUID(list_res.json()["data"][0]["id"])

    social_alert = Alert(
        id=uuid.uuid4(),
        alert_code="BLACKLIST_APP_DETECTED",
        title="Phát hiện mở Mạng xã hội trong giờ học",
        description="Học sinh đã mở ứng dụng Facebook (com.facebook.katana) trong giờ học.",
        severity=AlertSeverity.CRITICAL.value,
        status=AlertStatus.NEW.value,
        device_id=device_uuid,
        school_id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        campus_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        classroom_id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
        event_data={"packageName": "com.facebook.katana", "appName": "Facebook"},
    )
    db_session.add(social_alert)
    await db_session.commit()

    alerts_res = await client.get("/api/alerts?page=0&size=20", headers=it_admin_headers)
    assert alerts_res.status_code == 200
    content = alerts_res.json()["data"]["content"]
    assert len(content) >= 1
    codes = [a["alertCode"] for a in content]
    assert "BLACKLIST_APP_DETECTED" in codes


async def test_tc44_admin_filter_alerts_by_severity_and_search(client, it_admin_headers):
    """TC44: Admin lọc danh sách cảnh báo theo mức độ CRITICAL và từ khóa 'Facebook'."""
    res = await client.get(
        "/api/alerts?severity=CRITICAL&search=Facebook",
        headers=it_admin_headers,
    )
    assert res.status_code == 200
    content = res.json()["data"]["content"]
    assert len(content) >= 1
    assert content[0]["severity"] == "CRITICAL"
    assert "Facebook" in content[0]["description"]


async def test_tc45_admin_mark_alert_processing(client, it_admin_headers):
    """TC45: Admin chuyển trạng thái cảnh báo sang Đang xử lý (PROCESSING)."""
    res_list = await client.get("/api/alerts?search=Facebook", headers=it_admin_headers)
    alert_id = res_list.json()["data"]["content"][0]["id"]

    patch_res = await client.patch(
        f"/api/alerts/{alert_id}/status",
        headers=it_admin_headers,
        json={"status": "PROCESSING", "resolutionNote": "Admin đang kiểm tra màn hình học sinh"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["status"] == "PROCESSING"


async def test_tc46_admin_resolve_single_alert(client, it_admin_headers):
    """TC46: Admin đánh dấu Đã xử lý (RESOLVED) một cảnh báo vi phạm."""
    res_list = await client.get("/api/alerts?search=Facebook", headers=it_admin_headers)
    alert_id = res_list.json()["data"]["content"][0]["id"]

    patch_res = await client.patch(
        f"/api/alerts/{alert_id}/status",
        headers=it_admin_headers,
        json={"status": "RESOLVED", "resolutionNote": "Đã nhắc nhở học sinh đóng ứng dụng Facebook"},
    )
    assert patch_res.status_code == 200
    data = patch_res.json()["data"]
    assert data["status"] == "RESOLVED"
    assert data["resolvedAt"] is not None


async def test_tc47_admin_resolve_all_alerts_bulk(client, it_admin_headers):
    """TC47: Admin bấm 'Xử lý tất cả' để giải quyết toàn bộ cảnh báo tồn đọng (PUT /api/alerts/resolve-all)."""
    res = await client.put("/api/alerts/resolve-all", headers=it_admin_headers)
    assert res.status_code == 200
    assert "resolvedCount" in res.json()["data"]


async def test_tc48_dashboard_summary_for_admin_and_super_admin(
    client, it_admin_headers, super_admin_headers
):
    """TC48: Kiểm tra API Tổng quan Dashboard (/api/dashboard/summary) cho cả Admin và Super Admin."""
    res_admin = await client.get("/api/dashboard/summary", headers=it_admin_headers)
    assert res_admin.status_code == 200
    summary = res_admin.json()["data"]
    assert summary["totalDevices"] >= 2
    assert "safetyIndex" in summary
    assert "violationData" in summary
    assert "connectionStats" in summary

    res_super = await client.get("/api/dashboard/summary", headers=super_admin_headers)
    assert res_super.status_code == 200


async def test_tc49_dashboard_stats_endpoint(client, it_admin_headers):
    """TC49: Kiểm tra endpoint thống kê /api/dashboard/stats hoạt động đồng nhất."""
    res = await client.get("/api/dashboard/stats", headers=it_admin_headers)
    assert res.status_code == 200
    assert res.json()["data"]["totalDevices"] >= 2


async def test_tc50_logout_revokes_refresh_token(client):
    """TC50: Đăng xuất (/api/auth/logout) thu hồi Refresh Token, ngăn chặn dùng lại token cũ."""
    login_res = await client.post(
        "/api/auth/login",
        json={"username": "admin_test", "password": "Admin@123"},
    )
    refresh_token = login_res.json()["data"]["refreshToken"]

    logout_res = await client.post(
        "/api/auth/logout",
        json={"refreshToken": refresh_token},
    )
    assert logout_res.status_code == 200

    # Thử dùng lại refresh token đã đăng xuất -> phải bị từ chối 401
    reuse_res = await client.post(
        "/api/auth/refresh",
        json={"refreshToken": refresh_token},
    )
    assert reuse_res.status_code == 401
