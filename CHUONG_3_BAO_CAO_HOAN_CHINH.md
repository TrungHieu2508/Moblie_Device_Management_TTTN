# CHƯƠNG 3: KẾT QUẢ, ĐÁNH GIÁ VÀ HƯỚNG PHÁT TRIỂN

*(Bản hoàn chỉnh đã được cập nhật đồng bộ 100% với mã nguồn thực tế của dự án: Backend Python FastAPI + Pure WebSocket Hub + SQLAlchemy AsyncPG + PostgreSQL 16, Mô hình 2 vai trò `SUPER_ADMIN` & `IT_ADMIN`/`ADMIN` giới hạn theo Khu vực `campus_id`, Android Agent Kotlin Device Owner, Web Dashboard React 19 + Bản đồ số 3D, cùng kết quả kiểm thử tự động thực tế `50/50` trên Pytest và build thành công Frontend).*

---

## 3.1. Kịch bản và kết quả kiểm thử

Quá trình kiểm thử hệ thống **EDUSPHERE MDM** được triển khai kết hợp giữa hai phương pháp: **Kiểm thử Hộp đen (Black-box Testing)** theo các luồng nghiệp vụ đầu cuối (End-to-End) và **Kiểm thử Tích hợp tự động (Automated Unit & Integration Testing)** bằng `Pytest` và trình biên dịch `TypeScript / Vite`.

### 3.1.1. Kịch bản kiểm thử Hộp đen theo luồng nghiệp vụ

**Bảng 3.1. Kịch bản kiểm thử chức năng Ghi danh thiết bị và Quản lý mã QR**

| Mã TC | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Ghi danh thiết bị thành công với mã QR / mã ghi danh hợp lệ | 1. Admin (`SUPER_ADMIN` hoặc `IT_ADMIN`) tạo mã ghi danh và sinh QR trên `EnrollmentListPage`.<br>2. Mở ứng dụng Android Agent (`MainActivity`), quét mã QR hoặc nhập URL máy chủ + mã ghi danh.<br>3. Nhấn đăng ký (`POST /api/devices/register`). | - Agent lưu cấu hình server, nhận `registrationToken` và kết nối thành công tới `/ws/agent/{deviceId}`.<br>- Thiết bị hiển thị trạng thái kết nối và xuất hiện với trạng thái `ONLINE` trên Web Dashboard. | **ĐẠT** |
| **TC-02** | Chặn ghi danh khi mã không tồn tại, đã thu hồi, hết hạn hoặc hết lượt dùng | 1. Admin thu hồi mã ghi danh (`DELETE /api/enrollments/{id}`), hoặc sử dụng mã sai / hết hạn (`expiresAt`) / đã đạt giới hạn `maxUses`.<br>2. Thiết bị Agent gửi yêu cầu đăng ký với mã đó. | - Backend trả về lỗi từ chối hợp lệ (HTTP `404` khi mã không tồn tại/đã thu hồi; `400` khi hết hạn hoặc đạt giới hạn `maxUses`), cập nhật lượt dùng nguyên tử.<br>- Thiết bị không được ghi vào bảng `devices`. | **ĐẠT** |

---

**Bảng 3.2. Kịch bản kiểm thử chức năng Phòng vệ chủ động và Báo cáo cảnh báo**

| Mã TC | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-03** | Tự động chặn và gửi cảnh báo khi học sinh mở ứng dụng Giải trí / Mạng xã hội | 1. Thiết bị đang `ONLINE`, dịch vụ nền `HeartbeatService` đang chạy.<br>2. Học sinh mở ứng dụng thuộc danh mục Game/Mạng xã hội/Video hoặc app cấm mặc định (TikTok, Facebook, YouTube, Zalo, Free Fire...).<br>3. Quan sát màn hình thiết bị và Web Dashboard. | - Trên Android (`RuleDetector`): phát hiện trong vòng ~1,5 giây, lập tức đẩy về màn hình chính (`clearRecents`), hiển thị cảnh báo `AlertActivity` (hoặc giữ màn hình khóa `LockActivity`) và gửi `EVENT` (`BLACKLIST_APP_DETECTED`).<br>- Trên Backend & Web: lưu bản ghi vào `device_events` và `alerts`, cập nhật trạng thái thiết bị (`WARNING` hoặc `CRITICAL`), đẩy `NEW_ALERT` realtime lên Dashboard đúng Khu vực và lưu đầy đủ trong trang Lịch sử Cảnh báo (`AlertListPage`). | **ĐẠT** |
| **TC-04** | Cho phép sử dụng bình thường các ứng dụng hệ thống / học tập | 1. Thiết bị đang `ONLINE` (chế độ chặn blacklist mặc định).<br>2. Học sinh mở Launcher, Máy tính (`Calculator`), Google Docs hoặc ứng dụng không thuộc danh mục giải trí bị cấm. | - Agent không chặn ứng dụng, cho phép sử dụng bình thường.<br>- Không phát sinh sự kiện vi phạm hay cảnh báo giả trên Web Dashboard. | **ĐẠT** |

---

**Bảng 3.3. Kịch bản kiểm thử Điều khiển từ xa, Cô lập Khu vực và Truyền phát màn hình**

| Mã TC | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-05** | Gửi lệnh Khóa màn hình (`LOCK_SCREEN`) và Mở khóa (`UNLOCK_DEVICE`) qua Pure WebSocket | 1. Admin chọn một thiết bị đang `ONLINE` trên Web.<br>2. Nhấn **Khóa máy**, quan sát thiết bị; sau đó nhấn **Mở khóa**.<br>3. Thử gửi lệnh khi máy đang `OFFLINE`. | - Khi `ONLINE`: Backend đẩy khung JSON qua `/ws/agent/{deviceId}` ngay lập tức (`SENT`), Agent mở `LockActivity` chặn thao tác thoát và gửi phản hồi `COMMAND_ACK` (`EXECUTED`). Khi bấm Mở khóa, màn hình khóa tắt ngay.<br>- Khi `OFFLINE`: lệnh lưu hàng đợi DB ở trạng thái `PENDING`. | **ĐẠT** |
| **TC-06** | Cô lập quyền giám sát và điều khiển theo Khu vực (`campus_id`) | 1. Đăng nhập tài khoản `IT_ADMIN` thuộc Campus A.<br>2. Thử truy vấn danh sách, kết nối WebSocket `/ws/dashboard` hoặc gửi lệnh điều khiển tới thiết bị thuộc Campus B. | - API và `INITIAL_STATE` / luồng phát WebSocket chỉ trả về thiết bị thuộc Campus A.<br>- Mọi yêu cầu đọc chi tiết, sửa luật hoặc gửi lệnh sang Campus B bị chặn với HTTP `403 Forbidden`. | **ĐẠT** |
| **TC-07** | Yêu cầu truyền phát màn hình trực tiếp (`START_STREAM` / `STOP_STREAM`) | 1. Admin nhấn nút **Xem màn hình** tại `DeviceDetailPage`.<br>2. Cấp quyền `MediaProjection` trên hộp thoại Android (lần đầu) và quan sát luồng hình ảnh trên Web.<br>3. Nhấn **Dừng xem**. | - `ScreenCaptureService` chụp màn hình (`scale = 0.45f`), nén JPEG chất lượng 45 thành Base64 gửi qua WebSocket (`SCREEN_FRAME`, chu kỳ ~150 ms khi màn hình thay đổi).<br>- Cửa sổ Web hiển thị trực tiếp màn hình thiết bị và dừng truyền khi gửi `STOP_STREAM`. | **ĐẠT (Có điều kiện ràng buộc OS & băng thông)** |

---

**Bảng 3.4. Kịch bản kiểm thử Cập nhật ứng dụng từ xa (OTA Update)**

| Mã TC | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-08** | Gửi lệnh `UPDATE_APP` với URL file APK hợp lệ | 1. Admin nhập URL tải trực tiếp file `.apk` bản mới trên Web và phát lệnh `UPDATE_APP`.<br>2. `OtaUpdateManager` tải file về thư mục cache và gọi `PackageInstaller.Session` cài đặt. | - Khi thiết bị đã cấp đặc quyền **Device Owner** (`adb shell dpm set-device-owner ...`) và APK có cùng chữ ký số hợp lệ: quá trình cài đặt thực hiện tự động qua `PackageInstaller` và thông báo tại `OtaReceiver` (`STATUS_SUCCESS`).<br>- Nếu máy chưa có Device Owner hoặc OS yêu cầu xác thực: `OtaReceiver` nhận `STATUS_PENDING_USER_ACTION` và mở hộp thoại xác nhận cài đặt cho người dùng. | **ĐẠT (Phụ thuộc điều kiện Device Owner & APK hợp lệ)** |
| **TC-09** | Xử lý khi link tải APK bị lỗi (HTTP 404 / sai URL) | 1. Admin nhập đường dẫn file `.apk` không tồn tại hoặc server trả về HTTP 404.<br>2. Gửi lệnh `UPDATE_APP`. | - `OtaUpdateManager` phát hiện `responseCode != 200`, dừng phiên cài đặt và hiển thị thông báo `"Lỗi Cập Nhật"` trên thiết bị mà không làm crash `HeartbeatService`. | **ĐẠT** |

---

### 3.1.2. Kết quả kiểm thử Tích hợp tự động và Biên dịch mã nguồn

Bên cạnh kiểm thử Hộp đen thủ công, toàn bộ API Backend, logic bảo mật JWT, phân quyền 2 vai trò, WebSocket Hub và mã nguồn Frontend đều được kiểm chứng tự động thông qua bộ test `pytest` (sử dụng `httpx.AsyncClient` và SQLite in-memory `aiosqlite`) cùng trình biên dịch TypeScript/Vite.

**Bảng 3.5. Kết quả kiểm thử tự động Backend (`Pytest`) và Đóng gói Frontend (`Vite Build`)**

| STT | Phân hệ / Thành phần | Công cụ & Phạm vi | Mã kiểm thử | Số lượng | Kết quả thực tế |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | Xác thực JWT, Hồ sơ & RBAC 2 vai trò | `pytest` (`test_01_auth_and_users.py`) | `TC01` – `TC10` | 10 | **10/10 PASSED** |
| 2 | Quản lý Khu vực, Trường, Lớp & Chặn route cũ | `pytest` (`test_02_schools_and_sessions.py`) | `TC11` – `TC20` | 10 | **10/10 PASSED** |
| 3 | Mã ghi danh QR & Quản lý thiết bị | `pytest` (`test_03_devices_and_enrollments.py`) | `TC21` – `TC30` | 10 | **10/10 PASSED** |
| 4 | Điều khiển từ xa & Truyền phát WebSocket Live | `pytest` (`test_04_commands_and_realtime_stream.py`) | `TC31` – `TC42` | 12 | **12/12 PASSED** |
| 5 | Cảnh báo vi phạm, Thống kê Dashboard & Logout | `pytest` (`test_05_alerts_and_dashboard.py`) | `TC43` – `TC50` | 8 | **8/8 PASSED** |
| **Tổng Backend** | **Toàn bộ API & WebSocket MDM Server** | `.\.venv\Scripts\python.exe -m pytest -v` | **`TC01` – `TC50`** | **50** | **50/50 PASSED (`3.06s`, exit code `0`)** |
| **Frontend Build** | Giao diện Quản trị & Bản đồ số 3D | `npm run build` (`tsc -b && vite build`) | Kiểm tra kiểu TS + Bundle | 4.316 modules | **THÀNH CÔNG (`1.58s`, 0 lỗi)** |

---

## 3.2. Kết quả đạt được (Giao diện, Chức năng và Phân tích kỹ thuật)

Hệ thống **EDUSPHERE MDM** đã hoàn thiện đồng bộ cả ba phân hệ (**Android Agent**, **MDM Server**, **Web Dashboard**) và vận hành khép kín theo mô hình 2 vai trò đa cơ sở:

- **Phân hệ Web Dashboard (`web-dashboard`):** Hoàn thiện đầy đủ 12 màn hình chức năng chính gồm: Đăng nhập (`Login`), Tổng quan Dashboard với biểu đồ cảnh báo 7 ngày (`DashboardPage`), Quản lý Khu vực (`CampusListPage`), Trường học (`SchoolListPage`), Lớp học (`ClassroomListPage`), Quản lý Tài khoản & phân công Khu vực (`UserListPage`), Danh sách & lọc Thiết bị (`DeviceListPage`), Chi tiết Thiết bị – gửi lệnh – xem màn hình trực tiếp (`DeviceDetailPage`), Quản lý Mã/QR Ghi danh (`EnrollmentListPage`), Xử lý Cảnh báo vi phạm (`AlertListPage`), Bản đồ số 3D 4 cấp (`Map3DPage`) và Hồ sơ cá nhân (`ProfilePage`).
- **Phân hệ MDM Server (`mdm-server`):** Hoàn thiện hệ thống REST API (`/api/auth`, `/api/users`, `/api/campuses`, `/api/schools`, `/api/classrooms`, `/api/enrollments`, `/api/devices`, `/api/commands`, `/api/alerts`, `/api/rules`, `/api/dashboard`, `/api/health`) và hai kênh Pure WebSocket (`/ws/agent/{device_id}`, `/ws/dashboard`), tích hợp tài liệu OpenAPI/Swagger tại `/swagger-ui.html`.
- **Phân hệ Android Agent (`android-agent`):** Hoàn thiện quy trình ghi danh qua QR/thủ công (`MainActivity`), dịch vụ chạy nền bền bỉ (`HeartbeatService`, `HeartbeatWorker`, `BootCompletedReceiver`), bộ phát hiện ứng dụng vi phạm (`RuleDetector`), trình thu phát màn hình (`ScreenCaptureService`, `ScreenCaptureActivity`), trình thực thi lệnh Device Owner (`DeviceActionManager`), cập nhật OTA (`OtaUpdateManager`, `OtaReceiver`) và các màn hình khóa/cảnh báo (`LockActivity`, `AlertActivity`).

### 3.2.1. Thiết kế tối ưu tài nguyên trên Android Agent

Vì Android Agent phải chạy thường trực dưới nền (`Foreground Service`) trong suốt thời gian học tập của thiết bị, hệ thống được tối ưu theo hướng tách luồng và tiết giảm tần suất xử lý để tránh gây hao pin hoặc chiếm dụng băng thông:

- **Tách biệt chu kỳ thu thập và chu kỳ giám sát:** Trong `HeartbeatService.kt`, tác vụ gửi gói đo lường hệ thống (`METRICS`: RAM, bộ nhớ, pin, Wi-Fi, ứng dụng đang mở) chạy ở chu kỳ **30 giây/lần** (`delay(30000)`), tách riêng khỏi vòng lặp kiểm tra ứng dụng foreground chạy mỗi **1,5 giây/lần** (`delay(1500)` với `includeIcon = false` nhằm không truyền tải ảnh icon nặng qua mỗi nhịp kiểm tra).
- **Tối ưu truyền phát màn hình (`ScreenCaptureService.kt`):** Khung hình chụp từ `MediaProjection` được thu nhỏ kích thước theo hệ số `scale = 0.45f` (~480p), nén định dạng JPEG chất lượng `45`, sử dụng cơ chế so sánh chuỗi Base64 (`lastBase64Frame`) để chỉ truyền khung hình mới ở nhịp **150 ms** (~6–7 FPS) khi màn hình thay đổi; khi màn hình đứng yên, hệ thống chỉ gửi lại khung cuối mỗi **1.000 ms** để tiết kiệm CPU và băng thông mạng.
- **Chống lặp sự kiện vi phạm (Client-side Anti-spam):** `RuleDetector.kt` giới hạn tần suất gửi sự kiện `BLACKLIST_APP_DETECTED` lên máy chủ tối đa 1 lần mỗi **10 giây** cho cùng một ứng dụng đang vi phạm, tránh phát sinh lưu lượng dư thừa khi học sinh thao tác mở lại liên tục.

### 3.2.2. Giao tiếp thời gian thực Pure WebSocket và Tối ưu Máy chủ Backend

- **Kiến trúc WebSocket-First (loại bỏ lớp STOMP và Redis):** Thay vì duy trì bộ định tuyến STOMP hay dịch vụ Redis ngoài, Backend sử dụng trực tiếp WebSocket tích hợp sẵn trên FastAPI/Starlette thông qua `ConnectionManager` và `RealtimeNotifier`. Kết nối TCP hai chiều giữ liên tục giúp lệnh điều khiển (`LOCK_SCREEN`, `UNLOCK_DEVICE`, `SHOW_ALERT`, `RING_ALARM`, `START_STREAM`...) được đẩy thẳng từ Server xuống thiết bị mà không phải chờ chu kỳ HTTP Polling.
- **Chiến lược In-Memory kết hợp Snapshot (`MetricsPersistenceService`):** Mọi gói `METRICS` từ Agent được cập nhật tức thì vào bộ nhớ đệm RAM (`ConnectionManager.device_metrics`) phục vụ hiển thị realtime trên Dashboard, đồng thời chỉ ghi bản chụp xuống PostgreSQL mỗi **10 chu kỳ** (`METRICS_SAVE_EVERY = 10`, tương đương ~5 phút/lần) và ngay lần đầu tiên thiết bị gửi dữ liệu. Cách thiết kế này giảm ~90% số lần ghi dữ liệu định kỳ xuống ổ đĩa CSDL mà vẫn giữ được biểu đồ lịch sử.
- **Phát hiện mất kết nối tức thời và bảo vệ đa phiên:** Trạng thái `OFFLINE` được cập nhật ngay trong khối `finally` khi socket Agent ngắt (`agent_ws.py`), không phải chờ timeout. Bên cạnh đó, `ConnectionManager` quản lý đa tab trên Dashboard (`Dict[str, List[WebSocket]]`), lọc phát sóng đúng theo `campus_id`, và kiểm tra đúng đối tượng socket đang hoạt động trong `agent_disconnect()` để tránh kết nối cũ đóng muộn ghi đè nhầm trạng thái của kết nối mới.
- **Chống spam cảnh báo & tối ưu truy vấn thống kê:** Server áp dụng cửa sổ **60 giây** chống tạo trùng cảnh báo cùng mã sự kiện đang `NEW`/`PROCESSING`, đồng thời gộp câu truy vấn đếm số lượng thiết bị theo từng trạng thái trên Dashboard thành một truy vấn `GROUP BY` duy nhất (`routers/dashboard.py`).

### 3.2.3. Trực quan hóa không gian 3D và Tính toàn vẹn phân quyền

- **Bản đồ số 3D 4 cấp (`Map3DPage.tsx`):** Tổ chức dữ liệu không gian theo mô hình khoan sâu 4 cấp (*Campus → School → Classroom → Device*) bằng Three.js và React Three Fiber. Các mô hình máy tính bảng trong lớp học sử dụng vật liệu phát sáng (`emissive`) ánh xạ trực tiếp 4 trạng thái thiết bị (`#22c55e`: `ONLINE`, `#eab308`: `WARNING`, `#ef4444`: `CRITICAL`, `#64748b`: `OFFLINE`), giúp quản trị viên định vị nhanh thiết bị bất thường ngay trên mặt bằng phòng học.
- **Chuẩn hóa RBAC 2 vai trò & Cô lập khu vực:** Sau khi tinh gọn từ mô hình 3 vai trò cũ xuống 2 vai trò (`SUPER_ADMIN` và `IT_ADMIN`/`ADMIN`), toàn bộ các API truy vấn, chỉnh sửa thiết bị/trường/lớp/mã QR/luật/cảnh báo cũng như thông điệp WebSocket `INITIAL_STATE` và sự kiện realtime đều được kiểm soát phạm vi `campus_id` thống nhất tại tầng `dependencies.py` và `ConnectionManager`.

---

## 3.3. Đánh giá hệ thống

### 3.3.1. Ưu điểm nổi bật

1. **Kiến trúc gọn nhẹ, dễ triển khai và phản hồi tức thời:** Việc sử dụng **Python FastAPI + Pure WebSocket + SQLAlchemy AsyncPG** giúp loại bỏ hoàn toàn các thành phần trung gian nặng nề (Spring Boot STOMP Broker, Redis), rút ngắn thời gian khởi động hệ thống, giảm độ trễ truyền lệnh hai chiều và giúp đội ngũ trường học dễ dàng đóng gói, bảo trì chỉ với PostgreSQL và tiến trình Uvicorn.
2. **Cơ chế phòng vệ chủ động ngay tại thiết bị:** `RuleDetector.kt` chạy kiểm tra foreground mỗi 1,5 giây dựa trên cả `ApplicationInfo.category` (Android 8.0+), danh sách app giải trí cấm mặc định và chính sách `whitelist`/`blacklist`, cho phép đẩy học sinh khỏi ứng dụng vi phạm gần như ngay lập tức ngay cả khi kết nối mạng tạm thời chập chờn.
3. **Phân quyền chặt chẽ theo khu vực vận hành (`campus_id`):** Mô hình 2 vai trò gọn rõ giúp cán bộ CNTT và giáo viên dùng chung tài khoản `IT_ADMIN` quản lý linh hoạt đúng cơ sở mình phụ trách, trong khi `SUPER_ADMIN` giữ quyền điều phối liên khu vực và quản trị tài khoản.
4. **Trực quan hóa 3D gắn với dữ liệu thời gian thực:** Bản đồ số 3D 4 cấp kết hợp với luồng xem màn hình trực tiếp (`MediaProjection`) giúp việc giám sát lớp học trực quan hơn rõ rệt so với giao diện bảng tĩnh truyền thống.

### 3.3.2. Những hạn chế còn tồn đọng

1. **Hiệu năng và trải nghiệm của truyền phát màn hình Base64:** Giải pháp nén ảnh JPEG chất lượng 45 sang Base64 truyền qua WebSocket (~6–7 FPS) tuy dễ tương thích trình duyệt nhưng vẫn tạo tải payload lớn hơn nhiều so với luồng video nén phần cứng, dễ giảm khung hình nếu nhiều thiết bị stream đồng thời trên mạng Wi-Fi yếu; đồng thời trên Android vẫn cần người dùng bấm xác nhận hộp thoại `MediaProjection` lần đầu bật stream.
2. **Thao tác cấp quyền Device Owner ban đầu và điều kiện OTA:** Để sử dụng đầy đủ quyền `DevicePolicyManager` và cài đặt ngầm `PackageInstaller.Session`, thiết bị vẫn cần được cấp quyền qua cáp USB bằng lệnh `adb shell dpm set-device-owner ...` trên thiết bị chưa có tài khoản cá nhân; nếu thiếu quyền Device Owner hoặc APK cập nhật khác chữ ký, hệ điều hành sẽ chặn cài đặt ngầm và buộc hiện hộp thoại xác nhận người dùng.
3. **Phụ thuộc cấu hình mạng nội bộ (AP / Client Isolation):** Khi triển khai mô hình server đặt trong mạng LAN trường học, các mạng Wi-Fi công cộng có bật cơ chế cách ly thiết bị (*Client Isolation*, như đã ghi nhận khi thử nghiệm thực tế qua lỗi `EHOSTUNREACH`) sẽ chặn điện thoại kết nối tới IP nội bộ của máy chủ, đòi hỏi hạ tầng Wi-Fi phải cho phép giao tiếp nội mạng hoặc triển khai server ở một địa chỉ định tuyến tập trung.
4. **Giới hạn mở rộng đa tiến trình (Multi-node) của In-Memory Hub:** Vì `ConnectionManager` lưu bảng kết nối WebSocket và metrics mới nhất trong RAM của tiến trình FastAPI, cấu trúc hiện tại tối ưu cho mô hình một máy chủ đơn; nếu chạy nhiều worker/container Backend song song sau cân bằng tải, các worker sẽ chưa chia sẻ được danh sách kết nối nếu chưa có lớp đồng bộ trung gian.

---

## 3.4. Hướng phát triển trong tương lai

Để nâng cấp **EDUSPHERE MDM** từ sản phẩm đồ án thành giải pháp triển khai diện rộng ở quy mô nhiều cụm trường học, hệ thống định hướng phát triển theo hai nhóm mục tiêu sau:

### 3.4.1. Cải tiến giải pháp Kỹ thuật

1. **Nâng cấp Live Screen Streaming sang WebRTC / H.264:** Thay thế luồng ảnh JPEG Base64 qua WebSocket bằng **WebRTC** kết hợp bộ mã hóa phần cứng `MediaCodec` (H.264/VP8), giúp truyền phát video theo luồng ngang hàng (Peer-to-Peer) với độ mượt 30–60 FPS và giảm mạnh băng thông qua máy chủ trung tâm.
2. **Tích hợp Android Enterprise (Zero-touch Enrollment / QR Provisioning) và Samsung Knox SDK:** Tự động hóa quá trình cấp quyền **Device Owner** ngay từ màn hình thiết lập ban đầu của thiết bị qua quét mã QR hệ thống mà không cần cắm cáp chạy lệnh ADB thủ công, đồng thời khai thác thêm các API chuyên sâu cho máy tính bảng Samsung (như tự động cấp quyền quay màn hình không hiện hộp thoại xác nhận).
3. **Bổ sung Redis Pub/Sub cho kiến trúc đa nút và bảo mật TLS (HTTPS/WSS):** Khi triển khai cụm nhiều Backend worker/server sau Load Balancer, bổ sung Redis Pub/Sub làm kênh đồng bộ gói tin WebSocket liên tiến trình; đồng thời chuẩn hóa HTTPS và WSS (WebSocket over TLS) kèm cơ chế tự động gia hạn chứng chỉ nội bộ.
4. **Đồng bộ Rule Engine toàn diện hai chiều:** Mở rộng cơ chế đẩy chính sách từ Backend xuống Agent để thiết bị nhận và thực thi động cả các luật ngưỡng tài nguyên (`RAM_THRESHOLD`, `CPU_THRESHOLD`, `BATTERY_LOW`, `OFFLINE_DETECT`) song song với `APP_BLACKLIST` / `APP_WHITELIST`.

### 3.4.2. Mở rộng Tính năng

1. **Ứng dụng AI phân tích hành vi tập trung và dự báo bất thường:** Phân tích dữ liệu lịch sử `device_metrics_snapshots` và `device_events` (tần suất chuyển đổi ứng dụng, mức độ tiêu hao pin/RAM bất thường) nhằm đánh giá mức độ tập trung của lớp học và cảnh báo sớm nguy cơ hỏng hóc phần cứng.
2. **Mở rộng đa nền tảng và báo cáo kiểm toán chuyên sâu:** Phát triển thêm Agent/cấu hình quản trị tương thích giao thức **Apple MDM** cho hệ sinh thái iPadOS; hoàn thiện giao diện tra cứu `AuditLog` (nhật ký thao tác quản trị) kết hợp tính năng xuất báo cáo tổng hợp định dạng Excel/PDF cho ban giám hiệu nhà trường.
