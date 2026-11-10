# 🚀 HƯỚNG DẪN KHỞI ĐỘNG LẠI DỰ ÁN SAU KHI TẮT MÁY (TERMINAL ANTIGRAVITY - KẾ HOẠCH B)

> **Lưu ý kiến trúc**: Dự án chạy theo **Kế hoạch B (WebSocket-First Architecture)** nên **KHÔNG cần bật Redis**, chỉ cần **PostgreSQL + Backend (`mdm-server`) + Frontend (`web-dashboard`) + Điện thoại/Máy ảo (`android-agent`)**.
>
> 💡 **Mẹo quan trọng**: Terminal mặc định của Antigravity có chữ **`PS`** ở đầu dòng (`PS D:\...>`, tức là PowerShell). Các lệnh dưới đây đã được viết để **chạy đúng trên cả `PS` lẫn `CMD`** mà không bị lỗi nhầm Python 3.14!

---

## 📋 BƯỚC 1: Bật Docker Desktop & Khởi động PostgreSQL (Port `5434`)

1. Mở ứng dụng **Docker Desktop** trên Windows và đợi biểu tượng cá voi chuyển sang trạng thái **Engine running**.
2. Mở **Terminal** trong Antigravity và chạy:

```powershell
docker start mdm-postgres
```

*(Nếu container `mdm-postgres` chưa được tạo thì dùng lệnh sau)*:
```powershell
docker compose up -d postgres
```

Kiểm tra nhanh xem Database đã chạy chưa:
```powershell
docker ps
```
> Nếu thấy `mdm-postgres` đang `Up` ở cổng `0.0.0.0:5434->5432/tcp` là thành công.

---

## ⚙️ BƯỚC 2: Khởi động Backend `mdm-server` (Port `8081`)

### 🔹 Trường hợp A: Khi tắt máy mở lại hàng ngày (Đã có sẵn thư mục `.venv`)
> ⚠️ **Tại sao không dùng `.venv\Scripts\activate.bat`?** Vì khi dòng lệnh có chữ `PS ...>` ở đầu, file `.bat` sẽ không kích hoạt được `.venv`, khiến máy gọi nhầm **Python 3.14** và báo lỗi `No module named 'fastapi'`.
> Cách chuẩn nhất (chạy được trên mọi loại Terminal `PS` và `CMD`) là gọi thẳng `python.exe` bên trong `.venv`:

Tại **Terminal số 1** trong Antigravity, chạy:

```powershell
cd D:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\mdm-server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload --ws-ping-interval 20 --ws-ping-timeout 20
```

*(Hoặc nếu bạn muốn hiện chữ `(.venv)` ở đầu dòng `PS` thì gõ lệnh kích hoạt `.ps1` như sau)*:
```powershell
cd D:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\mdm-server
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload --ws-ping-interval 20 --ws-ping-timeout 20
```

---

### 🔹 Trường hợp B: Chạy mới từ đầu / Sang máy khác / Đã xóa `.venv` (Cần tạo `.venv`)

```powershell
cd D:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\mdm-server

# Trên máy hiện tại của bạn (có cả Python 3.14 và 3.12), bắt buộc tạo bằng Python 3.12:
py -3.12 -m venv .venv
# (Nếu sang máy khác chỉ cài 1 bản Python 3.11/3.12 thì dùng: python -m venv .venv)

.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload --ws-ping-interval 20 --ws-ping-timeout 20
```

- **Swagger API Docs**: http://localhost:8081/docs
- **Health Check**: http://localhost:8081/health

---

## 💻 BƯỚC 3: Khởi động Giao diện Web `web-dashboard` (Port `5173`)

Nhấn dấu **`+`** ở góc phải khung Terminal của Antigravity để mở **Terminal số 2** (**giữ nguyên Terminal 1 đang chạy Backend**), rồi chạy:

```powershell
cd D:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\web-dashboard
npm run dev -- --host
```
*(Nếu mới kéo code về máy mới lần đầu chưa có `node_modules` thì chạy `npm install` trước khi `npm run dev -- --host`)*.

- Truy cập trên máy tính: **http://localhost:5173**
- **Tài khoản đăng nhập**:
  - **Super Admin**: `admin` / `Admin@123` (hoặc mật khẩu bạn đã đổi)
  - **IT Admin**: Tạo trong mục *Quản lý Tài khoản*
  - **Giáo viên (`TEACHER`)**: Tạo trong mục *Quản lý Tài khoản*

---

## 📱 BƯỚC 4: Kết nối Điện thoại Android (`android-agent`)

### Trường hợp 1: Điện thoại đã cài sẵn App từ lần trước
1. Đảm bảo **Điện thoại** và **Laptop** bắt **cùng 1 mạng WiFi** (hoặc phát Hotspot từ điện thoại cho Laptop).
2. Mở app **EduSphere Agent** trên điện thoại:
   - Nếu **IP WiFi của Laptop không đổi**: App sẽ tự động kết nối lại (`Server Connection: Connected`).
   - Nếu **IP WiFi của Laptop bị đổi** (do sang quán cà phê / lên trường / tắt mở router):
     1. Mở thêm 1 tab Terminal và xem IP LAN mới của Laptop:
        ```powershell
        ipconfig
        ```
        *(Tìm dòng `IPv4 Address` trong mục `Wireless LAN adapter Wi-Fi`, ví dụ `192.168.1.15`)*.
     2. Mở trình duyệt máy tính theo địa chỉ IP LAN đó: `http://<IP_LAN_MOI>:5173` (ví dụ `http://192.168.1.15:5173`).
     3. Trên điện thoại, nhấn **GỠ GHI DANH (ĐỔI LỚP)** (nhập mã PIN: `123456`) → Quét lại mã QR trên trang **Mã ghi danh** (mã QR sẽ tự động lấy theo IP LAN mới trên thanh địa chỉ trình duyệt).

---

### Trường hợp 2: Cần Build & Cài lại file APK từ code mới nhất
Cắm cáp USB điện thoại vào máy tính (đã bật **USB Debugging**), mở 1 tab Terminal mới và chạy:

```powershell
cd D:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\android-agent
.\gradlew.bat :app:assembleDebug
adb -d install -r -t app\build\outputs\apk\debug\app-debug.apk
adb -d shell appops set com.edusphere.agent SYSTEM_ALERT_WINDOW allow
adb -d shell appops set com.edusphere.agent GET_USAGE_STATS allow
adb -d shell appops set com.edusphere.agent PROJECT_MEDIA allow
adb -d shell dpm set-active-admin com.edusphere.agent/.receiver.MDMAdminReceiver
```

---

## 🛡️ CÁC LỆNH ADB HỮU ÍCH KHI TEST ĐIỆN THOẠI

- **Kiểm tra điện thoại đã nhận cáp ADB chưa**:
  ```powershell
  adb devices
  ```
- **Cấp quyền `Device Owner` (để `MDM Privilege: Active`)**:
  ```powershell
  adb -d shell dpm set-device-owner com.edusphere.agent/.receiver.MDMAdminReceiver
  ```
- **Cấp quyền `Active Admin` (dự phòng khi máy vướng tài khoản Google không cho lên Device Owner)**:
  ```powershell
  adb -d shell dpm set-active-admin com.edusphere.agent/.receiver.MDMAdminReceiver
  ```
- **Gỡ quyền Admin qua ADB (khi muốn gỡ cài đặt app khỏi điện thoại)**:
  ```powershell
  adb -d shell dpm remove-active-admin com.edusphere.agent/.receiver.MDMAdminReceiver
  ```
- **Mở nhanh ứng dụng EduSphere Agent từ máy tính**:
  ```powershell
  adb -d shell am start -n com.edusphere.agent/.MainActivity
  ```

---

## 🔑 THÔNG TIN MẶC ĐỊNH TRONG DỰ ÁN

| Thành phần | Giá trị mặc định |
| :--- | :--- |
| **Cổng PostgreSQL (Docker)** | `localhost:5434` (User: `mdm_user` / Pass: `mdm_secret_2026` / DB: `mdm_db`) |
| **Cổng PostgreSQL (Docker)** | `localhost:5434` (User: `mdm_user` / Pass: `mdm_password` / DB: `mdm_db`) |
| **Cổng Backend (`mdm-server`)** | `http://0.0.0.0:8081` (WebSocket: `ws://<IP>:8081/ws/agent/{id}` & `/ws/dashboard`) |
| **Cổng Frontend (`web-dashboard`)** | `http://localhost:5173` |
| **Mã PIN Quản trị trên App Android** | `123456` (dùng khi mở khóa màn hình kỷ luật, tạm dừng MDM, hoặc gỡ ghi danh) |
