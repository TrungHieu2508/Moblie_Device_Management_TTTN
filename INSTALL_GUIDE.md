# Hướng dẫn cài đặt và chạy EduSphere Agent (Dành cho thành viên B)

Tài liệu này hướng dẫn chi tiết cách khởi chạy phần mềm **EduSphere Agent** (Ứng dụng Android) và cách cấp quyền **Device Owner** (Quyền quản trị cao nhất) cho app hoạt động đúng chức năng của hệ thống MDM (Mobile Device Management).

## 1. Yêu cầu hệ thống
- Đã cài đặt **Android Studio** (Phiên bản mới nhất).
- Đã thiết lập ít nhất 1 máy ảo (Emulator) hoặc có máy thật chạy Android cắm cáp USB (đã bật Developer Options và USB Debugging).
- (Lưu ý quan trọng) Nếu dùng máy thật, máy không được có quá nhiều người dùng (Users/Work profiles) vì lệnh cấp quyền Device Owner sẽ thất bại nếu thiết bị đang có nhiều User. Rất khuyến khích dùng **máy ảo (Emulator) mới tạo** để test.

---

## 2. Các bước Build và Cài đặt App

### Bước 2.1: Mở Project
1. Mở **Android Studio**.
2. Chọn `Open` và trỏ tới thư mục: `Moblie_Device_Management_TTTN/android-agent`.
3. Đợi một lát để Gradle Sync hoàn tất.

### Bước 2.2: Chạy App lên máy ảo/máy thật
1. Khởi động máy ảo (Emulator) từ bảng **Device Manager** trong Android Studio.
2. Đợi máy ảo khởi động lên màn hình chính.
3. Ở thanh công cụ phía trên của Android Studio, chọn thiết bị vừa bật, sau đó nhấn nút **Run (mũi tên màu xanh)** hoặc nhấn tổ hợp phím `Shift + F10`.
4. Đợi Gradle build và tự động cài app `EduSphere Agent` lên thiết bị.
5. Khi app mở lên, giao diện sẽ báo trạng thái **MDM Privilege: Not Configured** (Chưa được cấp quyền Device Owner).

---

## 3. Cấp quyền Device Owner bằng ADB

Đây là bước bắt buộc. Các tính năng quản trị thiết bị (MDM) sẽ không hoạt động nếu thiếu quyền này. App không thể tự cấp quyền cho chính nó, mà bắt buộc phải chạy lệnh từ máy tính (ADB) sang điện thoại/máy ảo.

### Bước 3.1: Mở Terminal
Ngay trong Android Studio, bạn nhấn vào tab **Terminal** ở phía dưới (hoặc dùng tổ hợp phím `Alt + F12`).

### Bước 3.2: Chạy lệnh cấp quyền
Copy và dán nguyên văn dòng lệnh sau vào Terminal, rồi nhấn `Enter`:

```bash
adb shell dpm set-device-owner com.edusphere.agent/.receiver.MDMAdminReceiver
```

**Dấu hiệu thành công:** 
Nếu Terminal in ra dòng chữ:
```text
Success: Device owner set to package com.edusphere.agent/.receiver.MDMAdminReceiver
Active admin set to component com.edusphere.agent/.receiver.MDMAdminReceiver
```
Xin chúc mừng! Bạn đã cấp quyền thành công.

**Các lỗi thường gặp:**
- `adb: command not found`: Máy bạn chưa cài môi trường ADB vào biến PATH. Bạn có thể sử dụng terminal mặc định của hệ điều hành và cd tới thư mục cài Android SDK (thường là `C:\Users\<TênUser>\AppData\Local\Android\Sdk\platform-tools`) để chạy lệnh này.
- `Not allowed to set the device owner because there are already several users on the device`: Máy thật của bạn đang có tài khoản khách, hoặc profile công việc. Xoá các tài khoản đó đi, hoặc tốt nhất là xoá máy ảo cũ tạo lại máy ảo mới tinh (Wipe data máy ảo).

### Bước 3.3: Kiểm tra lại trên App
Tắt app EduSphere Agent và mở lại. Lúc này giao diện sẽ chuyển trạng thái **MDM Privilege** sang màu xanh với chữ **Active**. App đã sẵn sàng nhận lệnh từ Server!

---

## 4. (Tuỳ chọn) Chạy lệnh khởi động Server

Nếu bạn muốn test toàn bộ quy trình, hãy đảm bảo Server cũng đang chạy.
Tại Terminal (hoặc mở một tab Terminal mới), di chuyển vào thư mục `mdm-server`:

```bash
cd ../mdm-server
```

Và chạy lệnh Spring Boot:

```bash
./mvnw spring-boot:run
```
*(Đảm bảo Docker Desktop đang bật và các container PostgreSQL, Redis, RabbitMQ của project đã chạy bằng lệnh `docker compose up -d`)*
