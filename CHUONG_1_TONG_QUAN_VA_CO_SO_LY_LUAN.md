# CHƯƠNG 1: TỔNG QUAN VÀ CƠ SỞ LÝ LUẬN

*(Bản hoàn chỉnh đã được cập nhật đồng bộ 100% với kiến trúc thực tế của dự án: Backend Python FastAPI + SQLAlchemy AsyncPG + Pure WebSocket Hub không dùng Redis/STOMP, Mô hình phân quyền 2 vai trò `SUPER_ADMIN` & `IT_ADMIN`/`ADMIN` giới hạn theo Khu vực `campus_id`, Android Agent Kotlin Device Owner hỗ trợ phòng vệ chủ động và Live Screen Streaming, Web Dashboard React 19 + TypeScript + Three.js / React Three Fiber 3D).*

---

## 1.1. Đặt vấn đề

Trong môi trường giáo dục số hiện đại, việc trang bị máy tính bảng (tablet) và thiết bị di động cho học sinh phục vụ học tập ngày càng trở nên phổ biến. Tuy nhiên, quá trình vận hành và quản lý số lượng lớn thiết bị dùng chung tại nhiều trường học đặt ra nhiều thách thức thực tế. Bộ phận kỹ thuật CNTT và giáo viên giảng dạy thường thiếu một công cụ giám sát tập trung theo thời gian thực để kiểm soát tình trạng thiết bị cũng như hoạt động sử dụng trong giờ học. Khi không có cơ chế kiểm soát phù hợp, học sinh dễ dàng truy cập các ứng dụng mạng xã hội, trò chơi hoặc nội dung giải trí ngoài mục đích học tập, làm giảm hiệu quả tiếp thu và gây khó khăn cho công tác vận hành, bảo trì hệ thống.

Hệ thống **EDUSPHERE MDM** được xây dựng nhằm giải quyết bài toán trên thông qua cơ chế giám sát trạng thái thời gian thực, tự động phát hiện – ngăn chặn vi phạm tại thiết bị và điều khiển tập trung từ xa theo mô hình tổ chức đa cơ sở. Hệ thống được thiết kế theo **ba thành phần độc lập**:

1. **Android Agent (`android-agent`):** Ứng dụng chạy ngầm với đặc quyền quản trị cấp thiết bị (Device Owner) trên máy tính bảng/điện thoại Android.
2. **MDM Server (`mdm-server`):** Máy chủ trung tâm tiếp nhận dữ liệu đo lường, quản lý danh mục tổ chức, xử lý cảnh báo, kiểm soát phân quyền theo khu vực và điều phối lệnh điều khiển hai chiều.
3. **Web Dashboard (`web-dashboard`):** Giao diện quản trị trực quan cho đội ngũ vận hành (Super Admin toàn hệ thống và tài khoản Admin dùng chung cho cán bộ CNTT cùng giáo viên tại từng cơ sở), hỗ trợ theo dõi thông số tức thời, truyền phát màn hình trực tiếp và tương tác bản đồ không gian 3D.

Việc phân tách rõ ràng ba thành phần giúp hệ thống dễ bảo trì, nâng cấp độc lập từng tầng và phù hợp để triển khai thực tế trong mạng nội bộ nhà trường.

---

## 1.2. Mục tiêu của đề tài

Đề tài hướng tới **4 mục tiêu trọng tâm**:

1. **Xây dựng ứng dụng Android Agent hoạt động bền bỉ dưới nền:**
   Sử dụng `Foreground Service` (`HeartbeatService.kt`) kết hợp tác vụ dự phòng (`HeartbeatWorker.kt`) để duy trì kết nối WebSocket hai chiều tới máy chủ; thu thập thông số phần cứng (RAM, bộ nhớ lưu trữ, phần trăm pin, Wi-Fi, ứng dụng đang hiển thị) gửi định kỳ **30 giây một lần**; kiểm tra ứng dụng foreground mỗi **1,5 giây** để chặn tức thời các ứng dụng giải trí/mạng xã hội bị cấm, đồng thời hỗ trợ thực thi lệnh điều khiển từ xa và truyền phát màn hình trực tiếp (`MediaProjection`).
2. **Phát triển MDM Server hiệu năng cao theo kiến trúc WebSocket-First:**
   Xây dựng máy chủ trung tâm bằng **Python FastAPI** với mô hình **Pure WebSocket Hub (không sử dụng STOMP hay Redis)** làm kênh giao tiếp thời gian thực chủ đạo. Máy chủ duy trì trạng thái kết nối và metrics mới nhất ngay trong bộ nhớ RAM (`ConnectionManager`), kết hợp lưu bản chụp lịch sử xuống PostgreSQL theo chu kỳ (`METRICS_SAVE_EVERY = 10`, tương đương ~5 phút/lần), tự động xử lý sự kiện vi phạm kèm cơ chế chống spam 60 giây và cô lập dữ liệu nghiêm ngặt giữa các Khu vực (`campus_id`).
3. **Xây dựng giao diện quản trị Web Dashboard hiện đại tích hợp Bản đồ số 3D:**
   Phát triển ứng dụng web quản trị bằng **React 19 + TypeScript** cập nhật trạng thái thiết bị, cảnh báo và luồng hình ảnh màn hình thiết bị theo thời gian thực qua WebSocket; tích hợp mô hình trực quan hóa không gian **3D 4 cấp** (*Khu vực → Trường học → Phòng học → Thiết bị*) bằng **Three.js** và **React Three Fiber**, giúp quản trị viên định vị và nhận diện tình trạng thiết bị trực quan hơn so với bảng dữ liệu truyền thống.
4. **Chuẩn hóa kiến trúc phân tầng, quản lý lược đồ CSDL và phân quyền 2 vai trò:**
   Tổ chức mã nguồn Backend theo các tầng tách biệt (*Routers → Services → Models / Schemas → WebSocket Hub*) trên nền **SQLAlchemy 2.0 AsyncEngine (`asyncpg`)** và **PostgreSQL 16**; kiểm soát phiên bản lược đồ dữ liệu bằng **Alembic**; chuẩn hóa mô hình quản trị gồm **2 vai trò (`SUPER_ADMIN` và `IT_ADMIN`/`ADMIN`)**, đảm bảo mỗi tài khoản Admin cơ sở chỉ được phép truy xuất và điều khiển thiết bị thuộc đúng Khu vực (`campus_id`) được phân công.

---

## 1.3. Phạm vi và giới hạn

### 1.3.1. Phạm vi hệ thống

1. **Thiết bị mục tiêu:** Quản lý các thiết bị di động (máy tính bảng, điện thoại thông minh) chạy hệ điều hành **Android 8.0 trở lên** (`minSdk = 26`, `targetSdk = 36`), tối ưu cho thiết bị thuộc sở hữu của nhà trường/đơn vị cấp phát (Corporate-Owned, không hướng tới mô hình thiết bị cá nhân BYOD).
2. **Mô hình tổ chức quản trị:** Hỗ trợ phân cấp tổ chức 3 tầng (*Khu vực `Campus` → Trường học `School` → Lớp học `Classroom`*) gắn với **2 vai trò quản trị**: `SUPER_ADMIN` (quản lý toàn hệ thống, quản lý Campus và tài khoản Admin) và `IT_ADMIN`/`ADMIN` (dùng chung cho cán bộ CNTT và giáo viên để quản lý trường, lớp, thiết bị, mã QR ghi danh và xử lý cảnh báo trong phạm vi một Khu vực).
3. **Môi trường mạng triển khai:** Hệ thống hỗ trợ vận hành hoàn toàn trong mạng nội bộ LAN/Wi-Fi của trường học (không phụ thuộc dịch vụ đám mây bên ngoài) hoặc triển khai qua Internet (WAN) khi cấu hình máy chủ tập trung.

### 1.3.2. Giới hạn đề tài

1. **Phụ thuộc `DevicePolicyManager` chuẩn và bước cấp quyền Device Owner ban đầu:**
   Ứng dụng Android Agent sử dụng API `DevicePolicyManager` chuẩn của Android (`Device Owner`), chưa tích hợp các API chuyên sâu đặc thù hãng như **Samsung Knox SDK**. Do ràng buộc bảo mật của hệ điều hành Android, thiết bị cần thực hiện một bước cấp quyền qua cáp USB (`adb shell dpm set-device-owner com.edusphere.agent/.receiver.MDMAdminReceiver`) trên máy chưa đăng nhập tài khoản cá nhân trước khi ghi danh bằng mã QR.
2. **Hiệu năng và trải nghiệm của truyền phát màn hình trực tiếp (Live Screen Streaming):**
   Chức năng xem màn hình trực tiếp (`ScreenCaptureService.kt`) được triển khai bằng `MediaProjection` + `ImageReader`, thực hiện thu nhỏ khung hình (`scale = 0.45f`), nén ảnh **JPEG chất lượng 45** thành chuỗi **Base64** và truyền qua WebSocket (`SCREEN_FRAME`, chu kỳ ~150 ms tương đương ~6–7 FPS). So với các giao thức truyền tải video chuyên dụng như **H.264** hay **WebRTC**, cách truyền từng ảnh Base64 tiêu tốn băng thông mạng nhiều hơn và độ mượt thấp hơn khi mạng yếu; đồng thời Android vẫn yêu cầu người dùng bấm xác nhận hộp thoại cấp quyền `MediaProjection` của hệ điều hành khi bắt đầu phiên quay màn hình.
3. **Khả năng mở rộng đa nút (Multi-Node Scaling):**
   Kiến trúc **WebSocket-First (Plan B - No Redis)** lưu trạng thái socket và metrics trực tiếp trong bộ nhớ RAM của tiến trình FastAPI giúp triển khai gọn nhẹ, phản hồi nhanh trên một máy chủ trường học. Tuy nhiên, nếu mở rộng sang mô hình cụm nhiều máy chủ (horizontal scaling / multi-worker), hệ thống sẽ cần bổ sung tầng Message Broker phân tán (như Redis Pub/Sub) để đồng bộ gói tin WebSocket giữa các instance.

---

## 1.4. Cơ sở lý luận

### 1.4.1. Khái niệm và mô hình kiến trúc MDM

**Mobile Device Management (MDM)** là tập hợp các giải pháp công nghệ, chính sách bảo mật và quy trình vận hành nhằm quản trị tập trung, giám sát và kiểm soát vòng đời thiết bị di động trong một tổ chức. Trong bối cảnh giáo dục, MDM giúp thiết bị luôn tuân thủ nội quy sử dụng trong giờ học, ngăn chặn phần mềm gây xao nhãng, hỗ trợ cấu hình từ xa và can thiệp kịp thời khi thiết bị mất kiểm soát.

Hệ thống **EDUSPHERE MDM** áp dụng mô hình kiến trúc phân tán 3 thành phần **Agent – Server – Console**:

- **Android Agent (Client):** Cài đặt trên thiết bị đầu cuối với đặc quyền **Device Owner** thông qua `DevicePolicyManager` (`DeviceActionManager.kt`, `MDMAdminReceiver.kt`). Đặc quyền này cho phép Agent thực thi các tác vụ cấp hệ thống mà không cần root thiết bị:
  - Khóa thiết bị tức thời (`lockNow`) hoặc bật màn hình khóa kỷ luật (`LockActivity`).
  - Kích hoạt chế độ Kiosk khóa vào ứng dụng (`setLockTaskPackages` + `startLockTask`).
  - Dọn dẹp ứng dụng chạy nền để giải phóng RAM (`setPackagesSuspended`).
  - Ẩn/hiện ứng dụng (`setApplicationHidden`), chặn gỡ cài đặt Agent (`setUninstallBlocked`).
  - Vô hiệu hóa camera (`setCameraDisabled`), chặn khôi phục cài đặt gốc (`addUserRestriction(UserManager.DISALLOW_FACTORY_RESET)`).
  - Khởi động lại (`reboot`) hoặc xóa sạch dữ liệu từ xa (`wipeData`).
- **MDM Server:** Đóng vai trò trung tâm điều phối xác thực, lưu trữ dữ liệu tổ chức/lịch sử, đánh giá sự kiện vi phạm, kiểm soát quyền truy cập theo Khu vực (`campus_id`) và chuyển tiếp thông điệp thời gian thực qua WebSocket.
- **Web Dashboard (Console):** Ứng dụng web cho phép Super Admin và Admin Khu vực theo dõi thiết bị qua bảng biểu, biểu đồ phân tích, luồng màn hình trực tiếp và bản đồ 3D, đồng thời gửi lệnh điều khiển tức thì xuống thiết bị.

---

### 1.4.2. Giao thức truyền thông thời gian thực và quản lý trạng thái

Các hệ thống quản lý thiết bị phân tán cần cân bằng giữa độ tin cậy giao dịch dữ liệu và độ trễ thấp cho lệnh điều khiển tức thời. Thay vì phụ thuộc hoàn toàn vào HTTP Polling gây lãng phí tài nguyên, **EDUSPHERE MDM** áp dụng mô hình **giao tiếp hỗn hợp (Hybrid Communication)**:

- **Cơ chế đồng bộ qua REST API (`/api/...`):** Dùng cho các nghiệp vụ mang tính giao dịch và cần xác thực chặt chẽ bằng JWT như đăng nhập/làm mới token (`/api/auth/*`), quản lý người dùng – khu vực – trường – lớp, tạo mã/QR ghi danh, đăng ký thiết bị lần đầu (`/api/devices/register`), cấu hình luật, xử lý cảnh báo và truy vấn dữ liệu thống kê Dashboard.
- **Cơ chế bất đồng bộ qua Pure WebSocket hai chiều:** Được chọn theo định hướng **WebSocket-First (loại bỏ lớp trung gian STOMP/SockJS và Redis)** để tối ưu tốc độ phản hồi và đơn giản hóa hạ tầng:
  - Phía Agent kết nối trực tiếp tới `/ws/agent/{deviceId}?token={deviceToken}` (sử dụng thư viện `Java-WebSocket`), gửi gói `METRICS`, `EVENT`, `SCREEN_FRAME`, `COMMAND_ACK` và nhận ngay các bản tin `COMMAND` từ server.
  - Phía Web Dashboard kết nối tới `/ws/dashboard?token={accessToken}` thông qua WebSocket thuần của trình duyệt (`useWebSocket.ts`), hỗ trợ tự động kết nối lại (auto-reconnect) khi gián đoạn mạng.
  - Trung tâm điều phối `ConnectionManager` và `RealtimeNotifier` phân phối gói tin trực tiếp trong bộ nhớ RAM tới đúng các tab Dashboard đang mở của `SUPER_ADMIN` hoặc của `IT_ADMIN` thuộc cùng `campus_id` với thiết bị, tránh rò rỉ dữ liệu liên khu vực.

**Cơ chế giám sát kết nối (Heartbeat & Liveness) và lưu trữ Snapshot:**

- `HeartbeatService.kt` trên Android duy trì vòng lặp gửi thông số sức khỏe thiết bị (`METRICS`: RAM, bộ nhớ, pin, CPU/Wi-Fi, ứng dụng đang mở) định kỳ mỗi **30 giây** (`delay(30000)`).
- Trên Server, mỗi gói `METRICS` được cập nhật tức thì vào bộ nhớ đệm RAM (`ConnectionManager.device_metrics`) để hiển thị thời gian thực trên Dashboard và chỉ ghi bản chụp (`device_metrics_snapshots`) xuống PostgreSQL định kỳ mỗi **10 lần nhận** (`METRICS_SAVE_EVERY = 10`, ~5 phút/lần) thông qua `MetricsPersistenceService`, giúp giảm mạnh áp lực I/O cho cơ sở dữ liệu.
- Trạng thái mất kết nối **`OFFLINE`** được phát hiện **tức thời ngay khi phiên WebSocket của Agent đóng hoặc đứt** (trong khối `finally` của `agent_ws.py`), thay vì phải chờ timeout hết hạn. Hệ thống cũng đối chiếu đúng đối tượng socket đang active trước khi đánh dấu `OFFLINE` để tránh lỗi socket cũ đóng muộn ghi đè trạng thái của kết nối mới khi thiết bị reconnect nhanh.

---

### 1.4.3. Kiến trúc Rule Engine và phân bổ logic xử lý cảnh báo

Hệ thống Rule Engine tự động hóa quá trình giám sát tuân thủ nội quy sử dụng thiết bị. Thực thể `Rule` (`mdm-server/app/models/rule.py`) lưu trữ cấu hình chi tiết dưới dạng kiểu bán cấu trúc **`JSONB`** (`rule_data`), cho phép khai báo linh hoạt thông số ngưỡng hoặc danh sách gói ứng dụng mà không phải thay đổi cấu trúc bảng CSDL. Hệ thống định nghĩa **6 loại quy tắc (`RuleType`)**: `APP_WHITELIST`, `APP_BLACKLIST`, `RAM_THRESHOLD`, `CPU_THRESHOLD`, `BATTERY_LOW`, và `OFFLINE_DETECT`; phạm vi áp dụng của luật được kiểm soát theo trường học (`school_id`) và Khu vực (`campus_id`).

Để khắc phục độ trễ mạng khi học sinh mở ứng dụng cấm (nếu chờ gửi lên Server phán quyết rồi gửi lệnh khóa về sẽ mất độ trễ khứ hồi), hệ thống **phân bổ một phần logic đánh giá xuống thiết bị (Client-side Evaluation)** tại `HeartbeatService.kt` và `RuleDetector.kt`:

1. Vòng lặp kiểm tra ứng dụng chạy nền mỗi **1,5 giây** (`delay(1500)`), trích xuất gói ứng dụng đang hiển thị (`foreground`) qua `UsageStatsManager` (`DeviceMonitor.kt`).
2. `RuleDetector.kt` kiểm tra tức thì theo 3 lớp: (a) danh mục ứng dụng của Android 8.0+ qua `ApplicationInfo.category` (`CATEGORY_GAME`, `CATEGORY_SOCIAL`, `CATEGORY_VIDEO`, `CATEGORY_AUDIO`), (b) tập ứng dụng giải trí/mạng xã hội bị cấm mặc định (`forbiddenSocialAndEntertainmentApps` như Facebook, Messenger, Instagram, Threads, YouTube, TikTok, Zalo, Liên Quân Mobile, Free Fire), và (c) danh sách `whitelist` / `blacklist` đồng bộ về thiết bị.
3. Ngay khi phát hiện vi phạm, Agent đẩy người dùng khỏi ứng dụng vi phạm về màn hình chính (`clearRecents()`), hiển thị cảnh báo vi phạm (`AlertActivity` hoặc giữ màn hình khóa `LockActivity`), đồng thời gửi sự kiện `BLACKLIST_APP_DETECTED` qua WebSocket lên Server (với cơ chế chống gửi lặp 10 giây trên Agent).
4. Trên Server (`_handle_event` trong `agent_ws.py`), sự kiện được ghi nhật ký vào bảng `device_events`, tạo bản ghi `Alert` trong bảng `alerts` kèm cửa sổ **chống trùng lặp cảnh báo 60 giây** và phát trực tiếp bản tin `NEW_ALERT` lên Web Dashboard của quản trị viên đúng khu vực.

---

### 1.4.4. Mô hình trực quan hóa 3D trên nền tảng Web

Phương pháp quản trị truyền thống bằng bảng dữ liệu hoặc danh sách văn bản gặp hạn chế lớn về nhận thức không gian: khi quản lý nhiều cơ sở và hàng chục phòng học, quản trị viên khó hình dung nhanh vị trí vật lý cụ thể của máy tính bảng đang gặp sự cố hay vi phạm.

Trực quan hóa **Bản đồ số 3D** giải quyết bài toán này bằng cách ánh xạ cấu trúc logic tổ chức thành không gian 3D tương tác trực tiếp (xoay, nghiêng, thu phóng bằng `OrbitControls`). Trong hệ thống (`Map3DPage.tsx`), không gian được thiết kế theo **đồ thị phân cấp 4 cấp**:

> **Campus (Khu vực) → School (Tòa nhà Trường học) → Classroom (Phòng học thu nhỏ) → Device (Mô hình Tablet trên bàn học)**

Nhờ kiến trúc phân cấp theo từng cấp độ (*drill-down*), trình duyệt chỉ render chi tiết các đối tượng ở cấp đang xem bằng **WebGL** thông qua **Three.js** và **React Three Fiber**, giúp duy trì hiệu năng mượt mà và tránh chồng chéo thông tin. Tại cấp lớp học, từng thiết bị được định danh bằng mô hình tablet phát sáng (`emissive` material) với dải màu phản ánh trạng thái theo thời gian thực (**Xanh lá `#22c55e`**: `ONLINE`, **Vàng `#eab308`**: `WARNING`, **Đỏ `#ef4444`**: `CRITICAL`, **Xám `#64748b`**: `OFFLINE`).

---

### 1.4.5. Công nghệ và framework cốt lõi

Hệ thống được xây dựng trên bộ công nghệ mã nguồn mở hiện đại, đồng bộ giữa cả 3 lớp ứng dụng:

- **Android Agent (Client-side):**
  - Ngôn ngữ **Kotlin**, mục tiêu biên dịch `minSdk = 26` (Android 8.0) đến `targetSdk = 36`.
  - Xử lý bất đồng bộ bằng **Kotlin Coroutines**, tiêm phụ thuộc bằng **Hilt** (+ KSP).
  - Giao tiếp mạng bằng **Retrofit + Gson** cho REST API (kèm `DynamicBaseUrlInterceptor` hỗ trợ đổi URL server động) và **Java-WebSocket (`1.5.3`)** cho kết nối WebSocket liên tục.
  - Lưu trữ cục bộ bằng **Room** (`edusphere_agent.db`) và `SharedPreferences`; duy trì chạy ngầm bằng **Foreground Service** (`HeartbeatService`, `ScreenCaptureService`), **WorkManager** (`HeartbeatWorker`) và `BootCompletedReceiver`; tích hợp quét mã QR bằng **ZXing (`zxing-android-embedded`)**; điều khiển thiết bị qua Android `DevicePolicyManager`, `UsageStatsManager` và `MediaProjection`.
- **Backend Server (Server-side):**
  - Phát triển bằng **Python 3.12** với framework **FastAPI (`0.115.0`)** và máy chủ ASGI **Uvicorn (`0.30.6`)**, thiết kế bất đồng bộ hoàn toàn (async/await) theo kiến trúc phân tầng gọn nhẹ.
  - Tầng xác thực & bảo mật dùng **JWT (`python-jose 3.3.0`, thuật toán `HS256` kèm `jti` duy nhất)** và băm mật khẩu **`bcrypt 4.2.0` / `passlib 1.7.4`**, áp dụng mô hình **RBAC 2 vai trò (`SUPER_ADMIN`, `IT_ADMIN`/`ADMIN`)** kết hợp kiểm soát phạm vi dữ liệu theo `campus_id`.
  - Tầng ánh xạ dữ liệu & kiểm tra đầu vào dùng **SQLAlchemy (`2.0.35`, AsyncEngine)** với driver **`asyncpg 0.29.0`** và **Pydantic v2 (`2.9.2`)**. Giao tiếp realtime dùng Pure WebSocket tích hợp sẵn của FastAPI/Starlette.
- **Frontend (Web Dashboard):**
  - Phát triển bằng **React 19 (`19.2.8`)** và **TypeScript (`~6.0.2`)**, đóng gói và phục vụ qua **Vite 8 (`8.2.0`)**.
  - Giao diện người dùng xây dựng bằng **Ant Design 6 (`6.5.3`)** và **TailwindCSS 4 (`4.3.3`)**; quản lý dữ liệu API & cache bằng **TanStack React Query 5**, quản lý trạng thái ứng dụng bằng **Zustand 5**; trực quan hóa biểu đồ thống kê bằng **Recharts 3** và không gian 3D bằng **Three.js (`0.185.1`)**, **React Three Fiber 9 (`9.7.0`)**, **`@react-three/drei`** và **`@react-three/postprocessing`**.
- **Lưu trữ dữ liệu, Hạ tầng và Kiểm thử:**
  - Cơ sở dữ liệu quan hệ **PostgreSQL 16 (`postgres:16-alpine`)**, tận dụng cột **`JSONB`** để lưu cấu hình luật (`rule_data`) và dữ liệu sự kiện (`event_data`) linh hoạt.
  - Quản lý phiên bản lược đồ CSDL bằng **Alembic (`1.13.2`)**; đóng gói container PostgreSQL và **pgAdmin 4** bằng **Docker Compose**; kiểm thử tự động API, bảo mật phân quyền và WebSocket bằng **Pytest + `pytest-asyncio` + `httpx` + `aiosqlite`**.
