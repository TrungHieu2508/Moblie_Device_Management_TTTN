"""
Nhóm 02: Kiểm thử Quản lý Cơ sở, Trường học, Lớp học, Phân quyền 2 Roles & Xác nhận Đã Xóa Teacher Class Sessions (TC11 -> TC20).
"""


async def test_tc11_create_and_list_campuses_scoped_by_role(client, super_admin_headers, it_admin_headers):
    """TC11: SUPER_ADMIN xem được mọi Cơ sở, còn Admin (IT_ADMIN) chỉ được xem đúng Khu vực mình quản lý."""
    create_res = await client.post(
        "/api/campuses",
        headers=super_admin_headers,
        json={
            "name": "Cơ sở Bình Thạnh - UTH",
            "code": "uth_bt",
            "address": "Quận Bình Thạnh, TP.HCM",
        },
    )
    assert create_res.status_code == 200
    other_campus_id = create_res.json()["data"]["id"]
    assert create_res.json()["data"]["code"] == "UTH_BT"

    # SUPER_ADMIN thấy toàn bộ các Campus (>= 2)
    super_list = await client.get("/api/campuses", headers=super_admin_headers)
    assert super_list.status_code == 200
    assert len(super_list.json()["data"]) >= 2

    # IT_ADMIN chỉ thấy đúng 1 Campus mà mình được phân công (Quận 12)
    admin_list = await client.get("/api/campuses", headers=it_admin_headers)
    assert admin_list.status_code == 200
    assert len(admin_list.json()["data"]) == 1
    assert admin_list.json()["data"][0]["id"] == "11111111-1111-1111-1111-111111111111"

    # IT_ADMIN cố tình truyền campusId của Khu vực khác (Bình Thạnh) -> bị chặn 403 Forbidden
    forbidden_schools = await client.get(f"/api/schools?campusId={other_campus_id}", headers=it_admin_headers)
    assert forbidden_schools.status_code == 403

    forbidden_devices = await client.get(f"/api/devices?campusId={other_campus_id}", headers=it_admin_headers)
    assert forbidden_devices.status_code == 403


async def test_tc12_update_campus_info(client, super_admin_headers):
    """TC12: SUPER_ADMIN cập nhật thông tin Cơ sở (PUT /api/campuses/{id})."""
    res = await client.put(
        "/api/campuses/11111111-1111-1111-1111-111111111111",
        headers=super_admin_headers,
        json={
            "name": "Cơ sở Quận 12 - ĐH GTVT TP.HCM (Updated)",
            "address": "70 Tô Ký, Quận 12, TP.HCM",
        },
    )
    assert res.status_code == 200
    assert "Updated" in res.json()["data"]["name"]


async def test_tc13_rbac_it_admin_cannot_create_or_delete_campus(client, it_admin_headers):
    """TC13: Kiểm tra RBAC: Admin thường (IT_ADMIN) không được phép tạo hoặc xóa Campus cấp hệ thống (HTTP 403)."""
    create_res = await client.post(
        "/api/campuses",
        headers=it_admin_headers,
        json={"name": "Campus Trái Phép", "code": "UNAUTH", "address": "TP.HCM"},
    )
    assert create_res.status_code == 403

    del_res = await client.delete(
        "/api/campuses/11111111-1111-1111-1111-111111111111",
        headers=it_admin_headers,
    )
    assert del_res.status_code == 403


async def test_tc14_create_and_list_schools(client, super_admin_headers, it_admin_headers):
    """TC14: Tạo Trường học mới thuộc Cơ sở và truy vấn danh sách Trường học."""
    create_res = await client.post(
        "/api/schools",
        headers=super_admin_headers,
        json={
            "name": "Trường THPT Chuyên Công Nghệ Số",
            "code": "thpt_cns",
            "address": "Quận 12, TP.HCM",
            "phone": "0988111222",
            "email": "info@thptcns.edu.vn",
            "campusId": "11111111-1111-1111-1111-111111111111",
        },
    )
    assert create_res.status_code == 200
    assert create_res.json()["data"]["code"] == "THPT_CNS"

    list_res = await client.get(
        "/api/schools?campusId=11111111-1111-1111-1111-111111111111",
        headers=it_admin_headers,
    )
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 2


async def test_tc15_update_school_info(client, it_admin_headers):
    """TC15: Cập nhật thông tin Trường học (PUT /api/schools/{id})."""
    school_id = "22222222-2222-2222-2222-222222222222"
    res = await client.put(
        f"/api/schools/{school_id}",
        headers=it_admin_headers,
        json={
            "name": "Trường THPT Thực Hành EduGuardian",
            "phone": "0909888777",
        },
    )
    assert res.status_code == 200
    assert res.json()["data"]["phone"] == "0909888777"


async def test_tc16_admin_create_and_list_classrooms(client, it_admin_headers):
    """TC16: Admin tạo Lớp học mới trong Trường và xem danh sách Lớp học."""
    school_id = "22222222-2222-2222-2222-222222222222"
    create_res = await client.post(
        f"/api/schools/{school_id}/classrooms",
        headers=it_admin_headers,
        json={"name": "Lớp 11A2 - Thực Hành Tin Học", "code": "11a2", "capacity": 45},
    )
    assert create_res.status_code == 200
    assert create_res.json()["data"]["code"] == "11A2"

    list_res = await client.get(f"/api/schools/{school_id}/classrooms", headers=it_admin_headers)
    assert list_res.status_code == 200
    codes = [c["code"] for c in list_res.json()["data"]]
    assert "12A1" in codes
    assert "11A2" in codes


async def test_tc17_admin_update_classroom(client, it_admin_headers):
    """TC17: Admin cập nhật tên và sĩ số Lớp học (PUT /api/classrooms/{id})."""
    classroom_id = "33333333-3333-3333-3333-333333333333"
    res = await client.put(
        f"/api/classrooms/{classroom_id}",
        headers=it_admin_headers,
        json={"name": "Lớp 12A1 - Chuyên Toán Tin", "capacity": 42},
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Lớp 12A1 - Chuyên Toán Tin"
    assert res.json()["data"]["capacity"] == 42


async def test_tc18_admin_get_all_classrooms_list(client, it_admin_headers):
    """TC18: Admin lấy danh sách toàn bộ Lớp học (GET /api/classrooms)."""
    res = await client.get("/api/classrooms", headers=it_admin_headers)
    assert res.status_code == 200
    assert len(res.json()["data"]) >= 2


async def test_tc19_removed_teacher_class_sessions_endpoints_return_404(client, it_admin_headers):
    """TC19: Xác nhận các API phiên học của Teacher Portal (/api/class-sessions/*) đã bị xóa hoàn toàn (HTTP 404)."""
    res_active = await client.get("/api/class-sessions/active", headers=it_admin_headers)
    assert res_active.status_code == 404

    res_history = await client.get("/api/class-sessions/history", headers=it_admin_headers)
    assert res_history.status_code == 404

    res_start = await client.post("/api/class-sessions/start", headers=it_admin_headers)
    assert res_start.status_code == 404


async def test_tc20_super_admin_update_and_manage_admin_user(client, super_admin_headers):
    """TC20: SUPER_ADMIN cập nhật thông tin tài khoản Admin (PATCH /api/users/{id})."""
    list_res = await client.get("/api/users?search=admin_coso_02", headers=super_admin_headers)
    user_id = list_res.json()["data"][0]["id"]

    upd_res = await client.patch(
        f"/api/users/{user_id}",
        headers=super_admin_headers,
        json={"fullName": "Admin Vận Hành Cơ Sở 02 (Đã Cập Nhật)"},
    )
    assert upd_res.status_code == 200
    assert "Đã Cập Nhật" in upd_res.json()["data"]["fullName"]
