"""
Nhóm 03: Kiểm thử Mã Ghi Danh QR (Enrollment), Đăng ký Thiết bị Học sinh & Quản lý Thiết bị bởi Admin (TC21 -> TC30).
"""


async def test_tc21_admin_create_qr_enrollment_code(client, it_admin_headers):
    """TC21: Admin tạo Mã Ghi Danh QR mới cho Lớp 12A1 (POST /api/enrollments)."""
    res = await client.post(
        "/api/enrollments",
        headers=it_admin_headers,
        json={
            "schoolId": "22222222-2222-2222-2222-222222222222",
            "campusId": "11111111-1111-1111-1111-111111111111",
            "classroomId": "33333333-3333-3333-3333-333333333333",
            "expiresInDays": 7,
            "maxUses": 45,
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data["code"]) == 6
    assert data["isActive"] is True
    assert data["classroomId"] == "33333333-3333-3333-3333-333333333333"


async def test_tc22_admin_list_active_enrollments(client, it_admin_headers):
    """TC22: Admin xem danh sách các Mã Ghi Danh QR đang hoạt động (GET /api/enrollments)."""
    res = await client.get("/api/enrollments", headers=it_admin_headers)
    assert res.status_code == 200
    items = res.json()["data"]
    assert len(items) >= 1
    assert items[0]["isActive"] is True


async def test_tc23_android_agent_register_with_qr_code(client, it_admin_headers):
    """TC23: Điện thoại Android học sinh quét QR đăng ký vào Lớp 12A1 (POST /api/devices/register)."""
    enroll_res = await client.get("/api/enrollments", headers=it_admin_headers)
    qr_code = enroll_res.json()["data"][0]["code"]

    reg_res = await client.post(
        "/api/devices/register",
        json={
            "deviceId": "R58M3575BAK",
            "deviceName": "Samsung Galaxy A50 - Học Sinh Nguyễn Văn An",
            "serialNumber": "R58M3575BAK",
            "model": "samsung SM-A505F",
            "androidVersion": "11",
            "agentVersion": "1.0.0",
            "enrollmentCode": qr_code,
        },
    )
    assert reg_res.status_code == 200
    data = reg_res.json()["data"]
    assert "deviceUuid" in data
    assert "registrationToken" in data
    assert data["classroomName"] == "Lớp 12A1 - Chuyên Toán Tin"
    assert "websocketUrl" in data["serverConfig"]


async def test_tc24_android_agent_reregister_existing_device_updates_info(client):
    """TC24: Thiết bị đã đăng ký gọi lại /api/devices/register sẽ cập nhật phiên bản mà không tạo trùng."""
    reg_res = await client.post(
        "/api/devices/register",
        json={
            "deviceId": "R58M3575BAK",
            "deviceName": "Samsung Galaxy A50 - Học Sinh Nguyễn Văn An",
            "model": "samsung SM-A505F",
            "androidVersion": "11",
            "agentVersion": "1.2.0",
        },
    )
    assert reg_res.status_code == 200
    assert "registrationToken" in reg_res.json()["data"]


async def test_tc25_register_second_student_device_for_bulk_tests(client, it_admin_headers):
    """TC25: Đăng ký thêm thiết bị học sinh thứ 2 vào cùng lớp để kiểm thử điều khiển hàng loạt."""
    enroll_res = await client.get("/api/enrollments", headers=it_admin_headers)
    qr_code = enroll_res.json()["data"][0]["code"]

    reg_res = await client.post(
        "/api/devices/register",
        json={
            "deviceId": "STUDENT_PHONE_02",
            "deviceName": "Xiaomi Redmi Note 12 - Học Sinh Lê Thị Bình",
            "serialNumber": "SN_XIAOMI_02",
            "model": "Xiaomi 23021RAA2Y",
            "androidVersion": "13",
            "agentVersion": "1.0.0",
            "enrollmentCode": qr_code,
        },
    )
    assert reg_res.status_code == 200
    assert reg_res.json()["data"]["schoolName"] == "Trường THPT Thực Hành EduGuardian"


async def test_tc26_admin_list_and_filter_student_devices(client, it_admin_headers):
    """TC26: Admin lấy danh sách thiết bị học sinh và tìm kiếm theo tên/lớp (GET /api/devices)."""
    all_res = await client.get("/api/devices", headers=it_admin_headers)
    assert all_res.status_code == 200
    assert len(all_res.json()["data"]) == 2

    search_res = await client.get("/api/devices?search=A505F", headers=it_admin_headers)
    assert search_res.status_code == 200
    assert len(search_res.json()["data"]) == 1
    assert search_res.json()["data"][0]["deviceId"] == "R58M3575BAK"


async def test_tc27_admin_get_single_device_detail(client, it_admin_headers):
    """TC27: Admin vào trang Chi tiết cụ thể của 1 thiết bị (GET /api/devices/{deviceUuid})."""
    list_res = await client.get("/api/devices?search=R58M3575BAK", headers=it_admin_headers)
    device_uuid = list_res.json()["data"][0]["id"]

    detail_res = await client.get(f"/api/devices/{device_uuid}", headers=it_admin_headers)
    assert detail_res.status_code == 200
    data = detail_res.json()["data"]
    assert data["deviceId"] == "R58M3575BAK"
    assert data["model"] == "samsung SM-A505F"


async def test_tc28_admin_update_device_name_and_notes(client, it_admin_headers):
    """TC28: Admin đổi tên hiển thị và ghi chú cho thiết bị học sinh (PUT /api/devices/{id})."""
    list_res = await client.get("/api/devices?search=R58M3575BAK", headers=it_admin_headers)
    device_uuid = list_res.json()["data"][0]["id"]

    upd_res = await client.put(
        f"/api/devices/{device_uuid}",
        headers=it_admin_headers,
        json={
            "deviceName": "Máy Số 01 - Nguyễn Văn An (12A1)",
            "notes": "Thiết bị ngồi bàn đầu dãy A",
        },
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["data"]["deviceName"] == "Máy Số 01 - Nguyễn Văn An (12A1)"
    assert upd_res.json()["data"]["notes"] == "Thiết bị ngồi bàn đầu dãy A"


async def test_tc29_admin_assign_device_to_classroom(client, it_admin_headers):
    """TC29: Admin gán/chuyển thiết bị học sinh sang lớp học khác (PATCH /api/devices/{id}/assign)."""
    list_res = await client.get("/api/devices?search=R58M3575BAK", headers=it_admin_headers)
    device_uuid = list_res.json()["data"][0]["id"]

    assign_res = await client.patch(
        f"/api/devices/{device_uuid}/assign",
        headers=it_admin_headers,
        json={
            "schoolId": "22222222-2222-2222-2222-222222222222",
            "campusId": "11111111-1111-1111-1111-111111111111",
            "classroomId": "33333333-3333-3333-3333-333333333333",
        },
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["data"]["classroom"]["id"] == "33333333-3333-3333-3333-333333333333"


async def test_tc30_admin_deactivate_qr_enrollment_code(client, it_admin_headers):
    """TC30: Admin vô hiệu hóa Mã Ghi Danh QR sau khi học sinh đã vào đủ (DELETE /api/enrollments/{id})."""
    create_res = await client.post(
        "/api/enrollments",
        headers=it_admin_headers,
        json={
            "schoolId": "22222222-2222-2222-2222-222222222222",
            "campusId": "11111111-1111-1111-1111-111111111111",
            "classroomId": "33333333-3333-3333-3333-333333333333",
        },
    )
    enrollment_id = create_res.json()["data"]["id"]

    del_res = await client.delete(f"/api/enrollments/{enrollment_id}", headers=it_admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True
