# 📋 DANH SÁCH 50 TEST CASES TỰ ĐỘNG HỆ THỐNG EDUGUARDIAN MDM

Tài liệu này liệt kê chi tiết **50 kịch bản kiểm thử tự động (`TC01` → `TC50`)** được cài đặt bằng `pytest` trong thư mục `mdm-server/tests/`. Bạn có thể sử dụng trực tiếp các bảng dưới đây cho chương **Kiểm thử Hệ thống (System Testing)** trong báo cáo Thực tập tốt nghiệp.

---

## Tổng quan Kết quả Kiểm thử

| STT | Phân hệ kiểm thử | File Test | Mã Test Case | Số lượng | Kết quả |
| :-: | :--- | :--- | :---: | :---: | :---: |
| 1 | Xác thực JWT, Hồ sơ & Phân quyền Tài khoản | `test_01_auth_and_users.py` | `TC01` – `TC10` | 10 | **10/10 PASSED (100%)** |
| 2 | Quản lý Cơ sở, Trường, Lớp & Phiên học Live | `test_02_schools_and_sessions.py` | `TC11` – `TC20` | 10 | **10/10 PASSED (100%)** |
| 3 | Mã Ghi Danh QR & Quản lý Thiết bị Học sinh | `test_03_devices_and_enrollments.py` | `TC21` – `TC30` | 10 | **10/10 PASSED (100%)** |
| 4 | Điều khiển Từ xa & Xem Màn hình Trực tiếp (Live Stream) | `test_04_commands_and_realtime_stream.py` | `TC31` – `TC42` | 12 | **12/12 PASSED (100%)** |
| 5 | Cảnh báo Chặn Mạng Xã Hội/Game & Dashboard | `test_05_alerts_and_dashboard.py` | `TC43` – `TC50` | 8 | **8/8 PASSED (100%)** |
| **Tổng** | **Toàn bộ Hệ thống EduGuardian MDM** | **5 Modules** | **`TC01` – `TC50`** | **50** | **50/50 PASSED (100%)** |

---

## Nhóm 1: Xác thực JWT, Hồ sơ cá nhân & Phân quyền (`TC01` → `TC10`)

| Mã TC | Tên kịch bản kiểm thử | API / Thành phần | Đầu vào (Input) | Kết quả kỳ vọng (Expected Output) | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC01** | Kiểm tra trạng thái máy chủ (Health Check) | `GET /api/health` | Gửi request kiểm tra tình trạng server | HTTP `200 OK`, `status: "UP"`, kiến trúc `WebSocket-First`, trả về số kết nối hiện tại | **PASSED** |
| **TC02** | Đăng nhập thành công với quyền `SUPER_ADMIN` | `POST /api/auth/login` | `username: "admin_test"`, mật khẩu đúng | HTTP `200 OK`, trả về `accessToken`, `refreshToken` và `role: "SUPER_ADMIN"` | **PASSED** |
| **TC03** | Từ chối đăng nhập khi nhập sai mật khẩu | `POST /api/auth/login` | `username: "admin_test"`, mật khẩu sai | HTTP `401 Unauthorized`, `success: false` | **PASSED** |
| **TC04** | Từ chối đăng nhập khi tài khoản không tồn tại | `POST /api/auth/login` | `username: "unknown_user_xyz"` | HTTP `401 Unauthorized`, `success: false` | **PASSED** |
| **TC05** | Cấp mới Access Token từ Refresh Token | `POST /api/auth/refresh` | `refreshToken` hợp lệ của Giáo viên | HTTP `200 OK`, trả về `accessToken` mới và thông tin `role: "TEACHER"` | **PASSED** |
| **TC06** | Xem thông tin hồ sơ người dùng đang đăng nhập | `GET /api/users/me` & `/me/profile` | Header chứa Bearer Token của Giáo viên | HTTP `200 OK`, trả về đúng thông tin tài khoản `teacher_test` | **PASSED** |
| **TC07** | Cập nhật họ tên và email cá nhân | `PATCH /api/users/me/profile` | `fullName`, `email` mới | HTTP `200 OK`, cập nhật thành công thông tin cá nhân trong DB | **PASSED** |
| **TC08** | Quản trị viên tạo tài khoản Giáo viên mới | `POST /api/users` | Thông tin tài khoản `TEACHER` mới | HTTP `200 OK`, tạo thành công tài khoản Giáo viên gắn với Trường & Cơ sở | **PASSED** |
| **TC09** | Chặn tạo tài khoản bị trùng Username/Email | `POST /api/users` | `username` hoặc `email` đã tồn tại | HTTP `409 Conflict`, thông báo trùng lặp tài khoản | **PASSED** |
| **TC10** | Kiểm tra phân quyền RBAC giữa Giáo viên & Admin | `POST /api/users` & `GET /api/users` | Token `TEACHER` gọi API tạo user | `TEACHER` bị chặn với HTTP `403 Forbidden`; `SUPER_ADMIN` truy vấn danh sách thành công (`200 OK`) | **PASSED** |

---

## Nhóm 2: Quản lý Cơ sở, Trường học, Lớp học & Phiên học Live (`TC11` → `TC20`)

| Mã TC | Tên kịch bản kiểm thử | API / Thành phần | Đầu vào (Input) | Kết quả kỳ vọng (Expected Output) | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC11** | Tạo mới và liệt kê danh sách Cơ sở (Campus) | `POST /api/campuses` & `GET /api/campuses` | Tên cơ sở, mã `uth_bt`, địa chỉ | HTTP `200 OK`, mã cơ sở tự động chuẩn hóa in hoa `UTH_BT` | **PASSED** |
| **TC12** | Cập nhật thông tin Cơ sở đào tạo | `PUT /api/campuses/{id}` | Tên và địa chỉ mới của Cơ sở | HTTP `200 OK`, dữ liệu Cơ sở được cập nhật chính xác | **PASSED** |
| **TC13** | Tạo mới và lọc Trường học theo Cơ sở | `POST /api/schools` & `GET /api/schools` | Tên trường, mã trường, `campusId` | HTTP `200 OK`, tạo trường thành công và lọc đúng theo `campusId` | **PASSED** |
| **TC14** | Giáo viên tạo Lớp học mới trong Trường | `POST /api/schools/{id}/classrooms` | Tên lớp `Lớp 11A2`, mã `11a2`, sĩ số `45` | HTTP `200 OK`, lớp mới được tạo với mã `11A2` và hiển thị trong danh sách lớp | **PASSED** |
| **TC15** | Giáo viên chỉnh sửa thông tin Lớp học | `PUT /api/classrooms/{id}` | Tên lớp mới và sĩ số mới (`42`) | HTTP `200 OK`, cập nhật thành công tên và sĩ số lớp học | **PASSED** |
| **TC16** | Giáo viên bắt đầu phiên học trực tiếp ngay lập tức | `POST /api/class-sessions/start` | `classroomId`, `teacherId` | HTTP `200 OK`, phiên học được mở với `status: "ACTIVE"` và ghi nhận `startedAt` | **PASSED** |
| **TC17** | Truy vấn danh sách các lớp đang Live | `GET /api/class-sessions/active` | `schoolId` | HTTP `200 OK`, trả về danh sách các phiên học có trạng thái `ACTIVE` | **PASSED** |
| **TC18** | Giáo viên đặt lịch học trước trên Thời khóa biểu | `POST /api/class-sessions/schedule` | `classroomId`, `teacherId`, giờ bắt đầu/kết thúc | HTTP `200 OK`, tạo lịch học với trạng thái `SCHEDULED` | **PASSED** |
| **TC19** | Kích hoạt buổi học đã lên lịch sang trạng thái Live | `POST /api/class-sessions/{id}/start` | `sessionId` của buổi học `SCHEDULED` | HTTP `200 OK`, chuyển trạng thái từ `SCHEDULED` sang `ACTIVE` | **PASSED** |
| **TC20** | Kết thúc buổi học và lưu vào Lịch sử buổi học | `POST /api/class-sessions/{id}/end` | `sessionId` của buổi học đang `ACTIVE` | HTTP `200 OK`, chuyển sang `ENDED` và xuất hiện trong `/api/class-sessions/history` | **PASSED** |

---

## Nhóm 3: Mã Ghi Danh QR (Enrollment) & Quản lý Thiết bị Học sinh (`TC21` → `TC30`)

| Mã TC | Tên kịch bản kiểm thử | API / Thành phần | Đầu vào (Input) | Kết quả kỳ vọng (Expected Output) | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC21** | Giáo viên tạo Mã Ghi Danh QR cho lớp học | `POST /api/enrollments` | `schoolId`, `campusId`, `classroomId`, hạn 7 ngày | HTTP `200 OK`, sinh mã QR gồm 6 ký tự duy nhất, `isActive: true` | **PASSED** |
| **TC22** | Giáo viên xem danh sách Mã Ghi Danh QR | `GET /api/enrollments` | Token `TEACHER` | HTTP `200 OK`, trả về danh sách các mã QR đang hoạt động | **PASSED** |
| **TC23** | Điện thoại Android quét mã QR đăng ký vào lớp | `POST /api/devices/register` | `deviceId: "R58M3575BAK"`, `enrollmentCode` | HTTP `200 OK`, tự động gán máy vào Lớp 12A1, cấp `registrationToken` & `websocketUrl` | **PASSED** |
| **TC24** | Thiết bị kết nối lại cập nhật thông tin không tạo trùng | `POST /api/devices/register` | Cùng `deviceId: "R58M3575BAK"`, `agentVersion: "1.2.0"` | HTTP `200 OK`, cập nhật phiên bản Agent, không sinh bản ghi trùng lặp | **PASSED** |
| **TC25** | Đăng ký thiết bị học sinh thứ 2 trong cùng lớp | `POST /api/devices/register` | `deviceId: "STUDENT_PHONE_02"`, `enrollmentCode` | HTTP `200 OK`, lớp học có nhiều thiết bị để phục vụ kiểm thử lệnh hàng loạt | **PASSED** |
| **TC26** | Giáo viên tìm kiếm & lọc thiết bị học sinh | `GET /api/devices?search=A505F` | Từ khóa tên máy/model `A505F` | HTTP `200 OK`, trả về đúng thiết bị `Samsung Galaxy A50` (`R58M3575BAK`) | **PASSED** |
| **TC27** | Giáo viên vào trang Chi tiết của 1 thiết bị cụ thể | `GET /api/devices/{deviceUuid}` | `deviceUuid` của máy học sinh | HTTP `200 OK`, trả về đầy đủ thông tin phần cứng, lớp học, trạng thái | **PASSED** |
| **TC28** | Giáo viên đổi tên hiển thị và ghi chú vị trí ngồi | `PUT /api/devices/{deviceUuid}` | `deviceName` mới, `notes` mới | HTTP `200 OK`, tên máy và ghi chú được lưu trữ thành công | **PASSED** |
| **TC29** | Giáo viên gán/chuyển lớp học cho thiết bị | `PATCH /api/devices/{deviceUuid}/assign` | `schoolId`, `campusId`, `classroomId` | HTTP `200 OK`, thiết bị được cập nhật sang lớp học chỉ định | **PASSED** |
| **TC30** | Giáo viên vô hiệu hóa Mã Ghi Danh QR | `DELETE /api/enrollments/{id}` | `enrollmentId` | HTTP `200 OK`, mã QR bị vô hiệu hóa để ngăn người lạ quét trái phép | **PASSED** |

---

## Nhóm 4: Điều khiển Từ xa & Phát Trực Tiếp Màn Hình Live Stream (`TC31` → `TC42`)

| Mã TC | Tên kịch bản kiểm thử | API / Thành phần | Đầu vào (Input) | Kết quả kỳ vọng (Expected Output) | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC31** | Gửi lệnh Khóa màn hình khi máy đang `OFFLINE` | `POST /api/devices/{uuid}/commands` | `commandType: "LOCK_SCREEN"` (máy chưa mở WS) | HTTP `200 OK`, lệnh được lưu vào hàng đợi DB với `status: "PENDING"` để tự gửi khi máy mở mạng | **PASSED** |
| **TC32** | Đẩy lệnh Khóa màn hình tức thì khi máy `ONLINE` | `POST /api/devices/{uuid}/commands` | `commandType: "LOCK_SCREEN"` (máy đang kết nối WS) | HTTP `200 OK`, đẩy gói tin JSON qua WebSocket ngay lập tức, `status: "SENT"` | **PASSED** |
| **TC33** | Giáo viên gửi lệnh Mở khóa thiết bị (`UNLOCK_DEVICE`) | `POST /api/devices/{uuid}/commands` | `commandType: "UNLOCK_DEVICE"` | HTTP `200 OK`, lệnh mở khóa được gửi xuống điện thoại học sinh (`status: "SENT"`) | **PASSED** |
| **TC34** | Giáo viên bật Xem màn hình trực tiếp (`START_STREAM`) | `POST /api/devices/{uuid}/commands` | `commandType: "START_STREAM"` | HTTP `200 OK`, yêu cầu quay màn hình trực tiếp được gửi xuống máy học sinh (`status: "SENT"`) | **PASSED** |
| **TC35** | Giáo viên dừng Xem màn hình trực tiếp (`STOP_STREAM`) | `POST /api/devices/{uuid}/commands` | `commandType: "STOP_STREAM"` | HTTP `200 OK`, lệnh dừng phát hình ảnh được gửi xuống máy học sinh (`status: "SENT"`) | **PASSED** |
| **TC36** | Giáo viên gửi tin nhắn nhắc nhở lên màn hình (`SHOW_ALERT`) | `POST /api/devices/{uuid}/commands` | `commandType: "SHOW_ALERT"`, nội dung nhắc nhở | HTTP `200 OK`, thông báo hiển thị đè lên màn hình điện thoại học sinh (`status: "SENT"`) | **PASSED** |
| **TC37** | Giáo viên bật Còi báo động (`RING_ALARM`) | `POST /api/devices/{uuid}/commands` | `commandType: "RING_ALARM"` | HTTP `200 OK`, kích hoạt chuông báo động âm lượng tối đa trên máy học sinh (`status: "SENT"`) | **PASSED** |
| **TC38** | Giáo viên gửi lệnh Dọn RAM & Đóng App nền | `POST /api/devices/{uuid}/commands` | `commandType: "CLEAR_BACKGROUND_APPS"` | HTTP `200 OK`, giải phóng bộ nhớ và đóng các tiến trình chạy ngầm (`status: "SENT"`) | **PASSED** |
| **TC39** | Giáo viên xem lịch sử các lệnh đã gửi cho thiết bị | `GET /api/devices/{uuid}/commands` | `deviceUuid`, phân trang `page=1&size=20` | HTTP `200 OK`, trả về danh sách lịch sử các lệnh (`LOCK_SCREEN`, `START_STREAM`, ...) | **PASSED** |
| **TC40** | Đồng bộ Realtime Pin, RAM & Ứng dụng đang mở | `GET /api/devices/{uuid}/metrics` & `/devices/{uuid}` | Agent cập nhật `batteryLevel: 88`, `currentApp: "Google Classroom"` | HTTP `200 OK`, trả về tức thì thông số Pin, RAM và tên ứng dụng học sinh đang mở từ bộ nhớ đệm | **PASSED** |
| **TC41** | Truyền phát khung hình Live Stream (`SCREEN_FRAME`) | `ConnectionManager.broadcast_to_dashboards` | Khung ảnh nén Base64 JPEG từ máy học sinh | Khung hình `SCREEN_FRAME` được phát trực tiếp tới WebSocket trên màn hình của Giáo viên | **PASSED** |
| **TC42** | Giải phóng trạng thái và bộ nhớ đệm khi máy ngắt kết nối | `ConnectionManager.agent_disconnect` | Thiết bị học sinh ngắt WebSocket | `is_device_online` chuyển về `False`, xóa sạch cache `metrics` và `currentApp` của máy đó | **PASSED** |

---

## Nhóm 5: Cảnh báo Chặn Mạng Xã Hội/Game, Thống kê Dashboard & Đăng xuất (`TC43` → `TC50`)

| Mã TC | Tên kịch bản kiểm thử | API / Thành phần | Đầu vào (Input) | Kết quả kỳ vọng (Expected Output) | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC43** | Ghi nhận & hiển thị cảnh báo khi mở Mạng xã hội (Facebook) | `GET /api/alerts` | Học sinh mở `com.facebook.katana` (`BLACKLIST_APP_DETECTED`) | HTTP `200 OK`, cảnh báo mức `CRITICAL` xuất hiện trên danh sách của Giáo viên | **PASSED** |
| **TC44** | Giáo viên lọc cảnh báo theo mức độ & từ khóa tìm kiếm | `GET /api/alerts?severity=CRITICAL&search=Facebook` | `severity=CRITICAL`, `search=Facebook` | HTTP `200 OK`, lọc chính xác bản ghi vi phạm mở ứng dụng Facebook | **PASSED** |
| **TC45** | Giáo viên chuyển trạng thái cảnh báo sang Đang xử lý | `PATCH /api/alerts/{id}/status` | `status: "PROCESSING"`, ghi chú kiểm tra | HTTP `200 OK`, trạng thái cảnh báo chuyển sang `PROCESSING` | **PASSED** |
| **TC46** | Giáo viên đánh dấu Đã xử lý (`RESOLVED`) cảnh báo | `PATCH /api/alerts/{id}/status` | `status: "RESOLVED"`, `resolutionNote` | HTTP `200 OK`, cập nhật `status: "RESOLVED"` và lưu thời điểm `resolvedAt` | **PASSED** |
| **TC47** | Giáo viên bấm "Xử lý tất cả" cảnh báo tồn đọng | `PUT /api/alerts/resolve-all` | Token `TEACHER` | HTTP `200 OK`, toàn bộ cảnh báo đang mở được chuyển sang `RESOLVED`, trả về `resolvedCount` | **PASSED** |
| **TC48** | Truy vấn dữ liệu Tổng quan Dashboard (Summary) | `GET /api/dashboard/summary` | Token `TEACHER` và `SUPER_ADMIN` | HTTP `200 OK`, trả về `totalDevices`, `onlineDevices`, `safetyIndex`, biểu đồ `violationData` | **PASSED** |
| **TC49** | Truy vấn thống kê Dashboard Stats | `GET /api/dashboard/stats` | Token `TEACHER` | HTTP `200 OK`, trả về đầy đủ số liệu thống kê thiết bị và kết nối | **PASSED** |
| **TC50** | Đăng xuất và thu hồi Refresh Token bảo mật | `POST /api/auth/logout` & `/api/auth/refresh` | Gửi `refreshToken` để đăng xuất, sau đó thử dùng lại | Đăng xuất `200 OK`; lần gọi `/refresh` tiếp theo bằng token cũ bị chặn với HTTP `401 Unauthorized` | **PASSED** |

