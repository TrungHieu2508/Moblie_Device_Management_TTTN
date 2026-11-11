"""
Nhóm 01: Kiểm thử Xác thực JWT, Đăng nhập, Hồ sơ cá nhân & Phân quyền Tài khoản (TC01 -> TC10).
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


async def test_tc04_login_nonexistent_user_rejected(client):
    """TC04: Đăng nhập với username không tồn tại phải bị từ chối (HTTP 401)."""
    res = await client.post(
        "/api/auth/login",
        json={"username": "unknown_user_xyz", "password": "Admin@123"},
    )
    assert res.status_code == 401
    assert res.json()["success"] is False


async def test_tc05_refresh_access_token_success(client):
    """TC05: Gia hạn Access Token mới từ Refresh Token hợp lệ (/api/auth/refresh)."""
    login_res = await client.post(
        "/api/auth/login",
        json={"username": "teacher_test", "password": "Teacher@123"},
    )
    refresh_token = login_res.json()["data"]["refreshToken"]

    refresh_res = await client.post(
        "/api/auth/refresh",
        json={"refreshToken": refresh_token},
    )
    assert refresh_res.status_code == 200
    data = refresh_res.json()["data"]
    assert "accessToken" in data
    assert data["user"]["username"] == "teacher_test"
    assert data["user"]["role"] == "TEACHER"


async def test_tc06_get_current_user_profile(client, teacher_headers):
    """TC06: Giáo viên lấy thông tin hồ sơ cá nhân (/api/users/me & /api/users/me/profile)."""
    res1 = await client.get("/api/users/me", headers=teacher_headers)
    assert res1.status_code == 200
    assert res1.json()["data"]["username"] == "teacher_test"

    res2 = await client.get("/api/users/me/profile", headers=teacher_headers)
    assert res2.status_code == 200
    assert res2.json()["data"]["role"] == "TEACHER"


async def test_tc07_update_personal_profile(client, teacher_headers):
    """TC07: Giáo viên cập nhật họ tên và email cá nhân (PATCH /api/users/me/profile)."""
    res = await client.patch(
        "/api/users/me/profile",
        headers=teacher_headers,
        json={
            "fullName": "Thầy Nguyễn Văn A (GVCN 12A1)",
            "email": "nguyenvana_gv@eduguardian.vn",
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["fullName"] == "Thầy Nguyễn Văn A (GVCN 12A1)"
    assert data["email"] == "nguyenvana_gv@eduguardian.vn"


async def test_tc08_super_admin_create_new_teacher_account(client, super_admin_headers):
    """TC08: SUPER_ADMIN tạo tài khoản Giáo viên mới thành công (POST /api/users)."""
    res = await client.post(
        "/api/users",
        headers=super_admin_headers,
        json={
            "username": "gv_toan_10a1",
            "email": "gv_toan@eduguardian.vn",
            "password": "Password@123",
            "fullName": "Cô Trần Thị B",
            "role": "TEACHER",
            "schoolId": "22222222-2222-2222-2222-222222222222",
            "campusId": "11111111-1111-1111-1111-111111111111",
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["username"] == "gv_toan_10a1"
    assert data["role"] == "TEACHER"


async def test_tc09_create_duplicate_username_conflict(client, super_admin_headers):
    """TC09: Tạo tài khoản trùng username/email phải báo lỗi 409 Conflict."""
    res = await client.post(
        "/api/users",
        headers=super_admin_headers,
        json={
            "username": "gv_toan_10a1",
            "email": "gv_toan@eduguardian.vn",
            "password": "Password@123",
            "fullName": "Cô Trần Thị B (Trùng)",
            "role": "TEACHER",
        },
    )
    assert res.status_code == 409
    assert res.json()["success"] is False


async def test_tc10_rbac_teacher_cannot_create_user(client, teacher_headers, super_admin_headers):
    """TC10: Kiểm tra phân quyền RBAC: Giáo viên không được phép tạo tài khoản hệ thống (HTTP 403)."""
    forbidden_res = await client.post(
        "/api/users",
        headers=teacher_headers,
        json={
            "username": "hacker_user",
            "email": "hacker@eduguardian.vn",
            "password": "Password@123",
            "fullName": "Unauthorized Create",
            "role": "SUPER_ADMIN",
        },
    )
    assert forbidden_res.status_code == 403

    # Trong khi SUPER_ADMIN có thể lấy danh sách tài khoản bình thường
    list_res = await client.get("/api/users?role=TEACHER", headers=super_admin_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 2
