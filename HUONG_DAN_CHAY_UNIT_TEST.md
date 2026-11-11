# 🧪 HƯỚNG DẪN CHẠY UNIT TEST & PYTEST TRÊN TERMINAL (CMD & POWERSHELL)

Tài liệu này hướng dẫn cách chạy bộ **50 Unit & Integration Test Cases (`TC01` → `TC50`)** của hệ thống **EduGuardian MDM** trên cả **PowerShell (`PS`)** và **CMD** trong Antigravity để kiểm tra tỷ lệ **100% PASSED**.

> **Lưu ý an toàn dữ liệu:** Bộ test sử dụng cơ sở dữ liệu ảo độc lập trong bộ nhớ (`SQLite In-Memory`), nên bạn có thể chạy bất kỳ lúc nào mà **không sợ ảnh hưởng hay mất dữ liệu thật** trong PostgreSQL (`mdm_db`).

---

## 1A. Nếu bạn đang dùng Terminal **PowerShell** (có chữ `PS` ở đầu dòng)

> ⚠️ **Lưu ý quan trọng trên PowerShell:** Trên PowerShell, lệnh `.venv\Scripts\activate.bat` **không có tác dụng** kích hoạt môi trường ảo (do `.bat` chỉ dành cho CMD). Vì vậy trên PowerShell bạn hãy dùng **Cách 1 (khuyên dùng, không bao giờ lỗi)** hoặc **Cách 2** bên dưới:

### Cách 1 (Nhanh nhất trên PowerShell — Gọi thẳng Python trong `.venv`):
Chỉ cần chạy 2 dòng lệnh sau:

```powershell
cd d:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\mdm-server
.\.venv\Scripts\python.exe -m pytest
```

*(Hoặc gộp thành 1 dòng duy nhất trên PowerShell)*:
```powershell
cd d:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\mdm-server; .\.venv\Scripts\python.exe -m pytest
```

### Cách 2 (Nếu muốn kích hoạt `(.venv)` trên PowerShell rồi gõ `pytest`):
Chạy lần lượt 4 dòng sau:

```powershell
cd d:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\mdm-server
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
pytest
```

---

## 1B. Nếu bạn đang dùng Terminal **CMD** (Command Prompt)

Mở **Terminal (CMD)** trong Antigravity và chạy lần lượt 3 dòng lệnh sau:

```cmd
cd /d d:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\mdm-server
.venv\Scripts\activate.bat
pytest
```

*(Hoặc chạy trực tiếp bằng 1 dòng lệnh duy nhất trên CMD)*:

```cmd
cd /d d:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\mdm-server && .venv\Scripts\python.exe -m pytest
```

---

### Kết quả chuẩn khi đạt 100% Passed:
```text
============================= test session starts =============================
collected 50 items

tests/test_01_auth_and_users.py::test_tc01_health_check_endpoint PASSED                  [  2%]
tests/test_01_auth_and_users.py::test_tc02_login_super_admin_success PASSED              [  4%]
...
tests/test_04_commands_and_realtime_stream.py::test_tc34_teacher_send_start_stream_live_screen_command PASSED [ 68%]
...
tests/test_05_alerts_and_dashboard.py::test_tc50_logout_revokes_refresh_token PASSED     [100%]

============================= 50 passed in 2.65s ==============================
```

---

## 2. Lệnh chạy kiểm thử theo từng phân hệ riêng biệt (Dùng chung cho cả PowerShell & CMD)

Khi đã đứng ở thư mục `mdm-server`, các lệnh dưới đây chạy được trên **cả PowerShell lẫn CMD**:

### Nhóm 1: Xác thực JWT, Đăng nhập & Phân quyền Tài khoản (`TC01` → `TC10`)
```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_01_auth_and_users.py
```

### Nhóm 2: Quản lý Cơ sở, Trường học, Lớp học & Phiên học Live (`TC11` → `TC20`)
```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_02_schools_and_sessions.py
```

### Nhóm 3: Mã Ghi Danh QR (Enrollment) & Quản lý Thiết bị Học sinh (`TC21` → `TC30`)
```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_03_devices_and_enrollments.py
```

### Nhóm 4: Điều khiển Từ xa (Khóa máy, Mở khóa, Còi, Dọn RAM) & Xem màn hình Live Stream (`TC31` → `TC42`)
```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_04_commands_and_realtime_stream.py
```

### Nhóm 5: Cảnh báo Chặn Mạng Xã Hội/Game & Thống kê Dashboard (`TC43` → `TC50`)
```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_05_alerts_and_dashboard.py
```

---

## 3. Lệnh chạy 1 Test Case cụ thể theo từ khóa (`-k`)

Bạn có thể dùng cờ `-k` để chạy riêng 1 hoặc vài test case bất kỳ (chạy được trên **cả PowerShell & CMD**):

```powershell
.\.venv\Scripts\python.exe -m pytest -k "tc32"
```

```powershell
.\.venv\Scripts\python.exe -m pytest -k "tc34 or tc41"
```

---

## 4. Kiểm tra Build Giao diện Web Dashboard (TypeScript + Vite)

Để kiểm tra toàn bộ mã nguồn React + TypeScript ở nhánh `web-dashboard` không có bất kỳ lỗi cú pháp hay kiểu dữ liệu nào (trên cả PowerShell & CMD):

```powershell
cd d:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\web-dashboard
npm run build
```

Kết quả thành công sẽ hiển thị:
```text
✓ built in ~1s
```

---

## 5. Cấu trúc thư mục các file Unit Test

| File | Số lượng Test | Nội dung kiểm thử chính |
| :--- | :---: | :--- |
| `mdm-server/pytest.ini` | — | Cấu hình chạy tự động Pytest AsyncIO |
| `mdm-server/tests/conftest.py` | — | Khởi tạo DB ảo In-Memory, Seed dữ liệu trường/lớp/tài khoản mẫu |
| `mdm-server/tests/test_01_auth_and_users.py` | 10 cases | Đăng nhập, JWT Refresh, Hồ sơ cá nhân, Phân quyền RBAC (`SUPER_ADMIN`, `IT_ADMIN`, `TEACHER`) |
| `mdm-server/tests/test_02_schools_and_sessions.py` | 10 cases | CRUD Cơ sở, Trường học, Lớp học, Bắt đầu/Lên lịch/Kết thúc buổi học trực tiếp |
| `mdm-server/tests/test_03_devices_and_enrollments.py` | 10 cases | Tạo mã QR, Đăng ký máy Android qua QR, Tìm kiếm/Đổi tên/Chuyển lớp cho máy |
| `mdm-server/tests/test_04_commands_and_realtime_stream.py` | 12 cases | Lệnh `LOCK_SCREEN`, `UNLOCK_DEVICE`, `START_STREAM`, `STOP_STREAM`, `SHOW_ALERT`, `RING_ALARM`, `CLEAR_BACKGROUND_APPS`, phát khung hình `SCREEN_FRAME` |
| `mdm-server/tests/test_05_alerts_and_dashboard.py` | 8 cases | Cảnh báo khi mở app cấm (Facebook/Game), lọc & xử lý cảnh báo, Thống kê Dashboard & Đăng xuất |
