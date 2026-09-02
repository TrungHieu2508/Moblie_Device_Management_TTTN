# Hướng dẫn Khởi chạy Toàn bộ Hệ thống EduSphere MDM

Tài liệu này hướng dẫn chi tiết cách mở và khởi chạy từng thành phần của dự án (Backend, Web Dashboard, và Android Agent) dành cho các thành viên trong nhóm.

---

## 1. Khởi động Database (Bắt buộc đầu tiên)

Hệ thống yêu cầu PostgreSQL và Redis để hoạt động. Chúng ta đã cấu hình sẵn trong Docker.

1. Đảm bảo bạn đã bật ứng dụng **Docker Desktop** trên máy tính.
2. Mở Terminal (Command Prompt / PowerShell / VS Code Terminal) tại thư mục gốc của dự án `Moblie_Device_Management_TTTN`.
3. Chạy lệnh sau để khởi động Database:
   ```bash
   docker compose up -d
   ```
   _(Hệ thống Database sẽ chạy ngầm. Để tắt đi, bạn dùng lệnh `docker compose down`)_

---

## 2. Khởi chạy Backend (mdm-server)

Backend được viết bằng **Spring Boot (Java)**.

**Cách 1: Chạy bằng Terminal (Nhanh nhất)**

1. Từ thư mục gốc dự án, di chuyển vào thư mục backend:
   ```bash
   cd mdm-server
   ```
2. Chạy lệnh khởi động:
   ```bash
   ./mvnw spring-boot:run
   ```
3. Đợi đến khi Terminal báo `Started MdmServerApplication...`. Server sẽ chạy ở địa chỉ `http://localhost:8080`.

**Cách 2: Chạy bằng IntelliJ IDEA (Dành cho thành viên code Backend)**

1. Mở phần mềm IntelliJ IDEA.
2. Chọn **Open**, trỏ tới thư mục `Moblie_Device_Management_TTTN/mdm-server`.
3. Đợi IDE load xong (Gradle/Maven sync). Tìm file `MdmServerApplication.java` và bấm nút **Play (Run)** màu xanh lá.

---

## 3. Khởi chạy Web Dashboard (Frontend)

Web Dashboard được viết bằng **React + Vite + TypeScript**. Đảm bảo bạn đã cài `Node.js`.

1. Mở một Tab Terminal **mới** (Giữ nguyên Terminal đang chạy Backend).
2. Từ thư mục gốc dự án, di chuyển vào thư mục web:
   ```bash
   cd web-dashboard
   ```
3. (Chỉ làm lần đầu tiên) Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
4. Khởi chạy giao diện Web:
   ```bash
   npm run dev
   ```
5. Terminal sẽ cung cấp một đường link (thường là `http://localhost:5173`). Bạn giữ `Ctrl` + Click vào link để mở bằng trình duyệt.

---

## 4. Khởi chạy Android Agent (Thiết bị học sinh)

Ứng dụng Android được viết bằng **Kotlin**. Phải chạy qua Android Studio để cài lên máy ảo/máy thật.

1. Mở phần mềm **Android Studio**.
2. Chọn **Open**, trỏ tới thư mục: `Moblie_Device_Management_TTTN/android-agent`.
3. Đợi thanh công cụ phía dưới chạy xong (Gradle Sync hoàn tất).
4. Khởi động một Máy ảo Android (Emulator) thông qua Device Manager của Android Studio.
5. Bấm nút **Run (Mũi tên màu xanh)** hoặc nhấn `Shift + F10` để build và cài App lên máy ảo.
6. (Bắt buộc) Để App có quyền MDM, bạn mở tab **Terminal** ở dưới cùng Android Studio và chạy lệnh:
   ```bash
   adb shell dpm set-device-owner com.edusphere.agent/.receiver.MDMAdminReceiver
   ```
7. App sẽ hiện giao diện Đăng ký. Nhập `Enrollment Code` (Lấy từ bảng của Backend) để kết nối máy ảo vào Dashboard!

Note:

```bash
adb shell dpm remove-active-admin com.edusphere.agent/.receiver.MDMAdminReceiver
```

Nếu ko được thì chạy:

```bash
adb shell dpm set-device-owner com.edusphere.agent/.receiver.MDMAdminReceiver
```

adb -d shell dpm remove-active-admin com.edusphere.agent/.receiver.MDMAdminReceiver
adb -d uninstall com.edusphere.agent
adb -d shell dpm set-device-owner com.edusphere.agent/.receiver.MDMAdminReceiver
adb install -r -t -d app\build\intermediates\apk\debug\app-debug.apk

---

### Tóm tắt Luồng Chạy:

**Docker (Database)** -> **Backend (Spring Boot)** -> **Web (React)** -> **Android (Kotlin/Emulator)**.
