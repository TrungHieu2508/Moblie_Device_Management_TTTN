"""
Nhóm 02: Kiểm thử Quản lý Cơ sở, Trường học, Lớp học & Phiên học trực tiếp (TC11 -> TC20).
"""

from datetime import datetime, timedelta, timezone


async def test_tc11_create_and_list_campuses(client, super_admin_headers, teacher_headers):
    """TC11: SUPER_ADMIN tạo Cơ sở (Campus) mới và Giáo viên xem danh sách Cơ sở."""
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
    assert create_res.json()["data"]["code"] == "UTH_BT"

    list_res = await client.get("/api/campuses", headers=teacher_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 2


async def test_tc12_update_campus_info(client, super_admin_headers):
    """TC12: Cập nhật thông tin Cơ sở (PUT /api/campuses/{id})."""
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


async def test_tc13_create_and_list_schools(client, super_admin_headers, teacher_headers):
    """TC13: Tạo Trường học mới thuộc Cơ sở và truy vấn danh sách Trường học."""
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
        headers=teacher_headers,
    )
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 2


async def test_tc14_teacher_create_and_list_classrooms(client, teacher_headers):
    """TC14: Giáo viên tạo Lớp học mới trong Trường và xem danh sách Lớp học."""
    school_id = "22222222-2222-2222-2222-222222222222"
    create_res = await client.post(
        f"/api/schools/{school_id}/classrooms",
        headers=teacher_headers,
        json={"name": "Lớp 11A2 - Thực Hành Tin Học", "code": "11a2", "capacity": 45},
    )
    assert create_res.status_code == 200
    assert create_res.json()["data"]["code"] == "11A2"

    list_res = await client.get(f"/api/schools/{school_id}/classrooms", headers=teacher_headers)
    assert list_res.status_code == 200
    codes = [c["code"] for c in list_res.json()["data"]]
    assert "12A1" in codes
    assert "11A2" in codes


async def test_tc15_teacher_update_classroom(client, teacher_headers):
    """TC15: Giáo viên cập nhật tên và sĩ số Lớp học (PUT /api/classrooms/{id})."""
    classroom_id = "33333333-3333-3333-3333-333333333333"
    res = await client.put(
        f"/api/classrooms/{classroom_id}",
        headers=teacher_headers,
        json={"name": "Lớp 12A1 - Chuyên Toán Tin", "capacity": 42},
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Lớp 12A1 - Chuyên Toán Tin"
    assert res.json()["data"]["capacity"] == 42


async def test_tc16_teacher_start_live_class_session_immediately(client, teacher_headers):
    """TC16: Giáo viên bấm 'Bắt đầu ngay' để mở phiên giám sát lớp học trực tiếp (ACTIVE)."""
    classroom_id = "33333333-3333-3333-3333-333333333333"
    teacher_id = "cccccccc-cccc-cccc-cccc-cccccccccccc"
    res = await client.post(
        f"/api/class-sessions/start?classroomId={classroom_id}&teacherId={teacher_id}",
        headers=teacher_headers,
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "ACTIVE"
    assert data["classroomId"] == classroom_id
    assert data["startedAt"] is not None


async def test_tc17_teacher_get_active_class_sessions(client, teacher_headers):
    """TC17: Giáo viên lấy danh sách các phiên lớp học đang Live (/api/class-sessions/active)."""
    school_id = "22222222-2222-2222-2222-222222222222"
    res = await client.get(
        f"/api/class-sessions/active?schoolId={school_id}",
        headers=teacher_headers,
    )
    assert res.status_code == 200
    sessions = res.json()["data"]
    assert len(sessions) >= 1
    assert sessions[0]["status"] == "ACTIVE"


async def test_tc18_teacher_schedule_future_class_session(client, teacher_headers):
    """TC18: Giáo viên lên lịch học trước cho Thời khóa biểu (/api/class-sessions/schedule)."""
    classroom_id = "33333333-3333-3333-3333-333333333333"
    teacher_id = "cccccccc-cccc-cccc-cccc-cccccccccccc"
    start_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    end_time = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()

    res = await client.post(
        "/api/class-sessions/schedule",
        headers=teacher_headers,
        json={
            "classroomId": classroom_id,
            "teacherId": teacher_id,
            "scheduledStartTime": start_time,
            "scheduledEndTime": end_time,
        },
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "SCHEDULED"

    sched_list = await client.get("/api/class-sessions/scheduled", headers=teacher_headers)
    assert sched_list.status_code == 200
    assert len(sched_list.json()["data"]) >= 1


async def test_tc19_teacher_activate_scheduled_session(client, teacher_headers):
    """TC19: Giáo viên kích hoạt buổi học đã lên lịch sang trạng thái đang Live (ACTIVE)."""
    sched_list = await client.get("/api/class-sessions/scheduled", headers=teacher_headers)
    session_id = sched_list.json()["data"][0]["id"]

    res = await client.post(
        f"/api/class-sessions/{session_id}/start",
        headers=teacher_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "ACTIVE"
    assert res.json()["data"]["startedAt"] is not None


async def test_tc20_teacher_end_session_and_verify_history(client, teacher_headers):
    """TC20: Giáo viên kết thúc buổi học và kiểm tra trong Lịch sử buổi học (/api/class-sessions/history)."""
    active_list = await client.get("/api/class-sessions/active", headers=teacher_headers)
    session_id = active_list.json()["data"][0]["id"]

    end_res = await client.post(
        f"/api/class-sessions/{session_id}/end",
        headers=teacher_headers,
    )
    assert end_res.status_code == 200
    assert end_res.json()["data"]["status"] == "ENDED"
    assert end_res.json()["data"]["endedAt"] is not None

    history_res = await client.get("/api/class-sessions/history", headers=teacher_headers)
    assert history_res.status_code == 200
    ended_ids = [s["id"] for s in history_res.json()["data"]]
    assert session_id in ended_ids

