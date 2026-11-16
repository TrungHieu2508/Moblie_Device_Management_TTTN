"""
Nhóm 01: Kiểm thử Xác thực JWT, Đăng nhập, Hồ sơ cá nhân & Phân quyền 2 Roles (SUPER_ADMIN & ADMIN) (TC01 -> TC10).
"""


async def test_tc01_health_check_endpoint(client):
    """TC01: Kiểm tra trạng thái hoạt động của máy chủ MDM (/api/health)."""
    res = await client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "UP"
    assert "WebSocket-First" in body["architecture"]
    assert "online_agents" in body
    assert "online_dashboards" in body


async def test_tc02_login_super_admin_success(client):
    """TC02: Đăng nhập thành công với tài khoản SUPER_ADMIN hợp lệ."""
    res = await client.post(
        "/api/auth/login",
        json={"username": "admin_test", "password": "Admin@123"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "accessToken" in data
    assert "refreshToken" in data
    assert data["user"]["username"] == "admin_test"
    assert data["user"]["role"] == "SUPER_ADMIN"


async def test_tc03_login_wrong_password_rejected(client):
    """TC03: Đăng nhập sai mật khẩu phải bị từ chối (HTTP 401)."""
    res = await client.post(
        "/api/auth/login",
        json={"username": "admin_test", "password": "WrongPassword999"},
    )
    assert res.status_code == 401
    assert res.json()["success"] is False


async def test_tc04_login_legacy_teacher_role_rejected(client, legacy_teacher_headers):
    """TC04: Tài khoản có role TEACHER cũ bị chặn đăng nhập (HTTP 401) và chặn gọi API (HTTP 403)."""
    res = await client.post(
        "/api/auth/login",
        json={"username": "legacy_teacher", "password": "Teacher@123"},
    )
    assert res.status_code == 401
    assert res.json()["success"] is False

    # Token cũ mang ROLE_TEACHER gọi API bảo vệ phải bị chặn 403 Forbidden
    me_res = await client.get("/api/users/me", headers=legacy_teacher_headers)
    assert me_res.status_code == 403


async def test_tc05_refresh_access_token_admin_success(client):
    """TC05: Admin (IT_ADMIN) đăng nhập và gia hạn Access Token mới từ Refresh Token hợp lệ."""
    login_res = await client.post(
        "/api/auth/login",
        json={"username": "itadmin_test", "password": "ItAdmin@123"},
    )
    assert login_res.status_code == 200
    refresh_token = login_res.json()["data"]["refreshToken"]

    refresh_res = await client.post(
        "/api/auth/refresh",
        json={"refreshToken": refresh_token},
    )
    assert refresh_res.status_code == 200
    data = refresh_res.json()["data"]
    assert "accessToken" in data
    assert data["user"]["username"] == "itadmin_test"
    assert data["user"]["role"] == "IT_ADMIN"


async def test_tc06_get_current_admin_profile(client, it_admin_headers):
    """TC06: Admin lấy thông tin hồ sơ cá nhân (/api/users/me & /api/users/me/profile)."""
    res1 = await client.get("/api/users/me", headers=it_admin_headers)
    assert res1.status_code == 200
    assert res1.json()["data"]["username"] == "itadmin_test"

    res2 = await client.get("/api/users/me/profile", headers=it_admin_headers)
    assert res2.status_code == 200
    assert res2.json()["data"]["role"] == "IT_ADMIN"


async def test_tc07_update_personal_profile(client, it_admin_headers):
    """TC07: Admin cập nhật họ tên và email cá nhân (PATCH /api/users/me/profile)."""
    res = await client.patch(
        "/api/users/me/profile",
        headers=it_admin_headers,
        json={
            "fullName": "Quản Trị Viên CNTT & Lớp Học (Admin)",
            "email": "admin_ops@eduguardian.vn",
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["fullName"] == "Quản Trị Viên CNTT & Lớp Học (Admin)"
    assert data["email"] == "admin_ops@eduguardian.vn"


async def test_tc08_super_admin_create_new_admin_account_and_reject_teacher_role(
    client, super_admin_headers
):
    """TC08: SUPER_ADMIN tạo tài khoản IT_ADMIN mới thành công và từ chối tạo role TEACHER (HTTP 400)."""
    res = await client.post(
        "/api/users",
        headers=super_admin_headers,
        json={
            "username": "admin_coso_02",
            "email": "admin_coso_02@eduguardian.vn",
            "password": "Password@123",
            "fullName": "Admin Vận Hành Cơ Sở 02",
            "role": "IT_ADMIN",
            "schoolId": "22222222-2222-2222-2222-222222222222",
            "campusId": "11111111-1111-1111-1111-111111111111",
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["username"] == "admin_coso_02"
    assert data["role"] == "IT_ADMIN"

    # Thử tạo tài khoản với role TEACHER -> phải bị từ chối 400
    invalid_role_res = await client.post(
        "/api/users",
        headers=super_admin_headers,
        json={
            "username": "invalid_teacher",
            "email": "invalid_teacher@eduguardian.vn",
            "password": "Password@123",
            "fullName": "Không Được Tạo Teacher",
            "role": "TEACHER",
        },
    )
    assert invalid_role_res.status_code == 400


async def test_tc09_create_duplicate_username_conflict(client, super_admin_headers):
    """TC09: Tạo tài khoản trùng username/email phải báo lỗi 409 Conflict."""
    res = await client.post(
        "/api/users",
        headers=super_admin_headers,
        json={
            "username": "admin_coso_02",
            "email": "admin_coso_02@eduguardian.vn",
            "password": "Password@123",
            "fullName": "Admin Trùng",
            "role": "IT_ADMIN",
        },
    )
    assert res.status_code == 409
    assert res.json()["success"] is False


async def test_tc10_rbac_it_admin_cannot_create_user(client, it_admin_headers, super_admin_headers):
    """TC10: Kiểm tra phân quyền RBAC: IT_ADMIN không được phép tạo tài khoản hệ thống (HTTP 403)."""
    forbidden_res = await client.post(
        "/api/users",
        headers=it_admin_headers,
        json={
            "username": "hacker_user",
            "email": "hacker@eduguardian.vn",
            "password": "Password@123",
            "fullName": "Unauthorized Create",
            "role": "SUPER_ADMIN",
        },
    )
    assert forbidden_res.status_code == 403

    # Trong khi SUPER_ADMIN có thể lấy danh sách tài khoản IT_ADMIN bình thường
    list_res = await client.get("/api/users?role=IT_ADMIN", headers=super_admin_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 2
