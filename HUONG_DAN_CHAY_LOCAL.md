# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN MDM (LOCAL)

Dự án EduGuardian MDM bao gồm 3 thành phần chính: **Backend (FastAPI)**, **Frontend (React/Vite)**, và **Android Agent (Kotlin)**.
Dưới đây là hướng dẫn chi tiết từng bước để chạy dự án trên máy tính cá nhân (Localhost).

---

## 1. YÊU CẦU MÔI TRƯỜNG (PREREQUISITES)
Trước khi bắt đầu, đảm bảo máy tính của bạn đã cài đặt các phần mềm sau:
- **Python 3.10+** (Cho Backend)
- **Node.js 18+** (Cho Frontend)
- **PostgreSQL 14+** (Cơ sở dữ liệu)
- **Android Studio** (Để build và chạy App lên máy ảo/thật)

---

## 2. CẤU HÌNH CƠ SỞ DỮ LIỆU (POSTGRESQL)
Bạn cần tạo một Database trống cho dự án trước khi chạy Backend.
1. Mở pgAdmin 4 hoặc DBeaver.
2. Tạo một Database mới với tên (ví dụ): `mdm_database`
3. Ghi nhớ `username` và `password` của PostgreSQL (thường mặc định là postgres / postgres).

---

## 3. CÀI ĐẶT VÀ CHẠY BACKEND (FASTAPI)
Phần Backend nằm trong thư mục `mdm-server`.

**Bước 3.1. Thiết lập môi trường ảo (Virtual Environment)**
Mở Terminal (CMD/PowerShell) tại thư mục gốc của dự án và chạy:
```bash
cd mdm-server
python -m venv .venv
```

**Bước 3.2. Kích hoạt môi trường ảo**
- Trên Windows:
```bash
.venv\Scripts\activate
```
- Trên Mac/Linux:
```bash
source .venv/bin/activate
```

**Bước 3.3. Cài đặt thư viện (Dependencies)**
Sau khi kích hoạt `.venv` (chữ `.venv` hiện ở đầu dòng), chạy:
```bash
pip install -r requirements.txt
```

**Bước 3.4. Cấu hình Database (File .env)**
Tạo một file `.env` ở trong thư mục `mdm-server` (hoặc kiểm tra file cấu hình db/config) và điền chuỗi kết nối PostgreSQL của bạn. Ví dụ:
`DATABASE_URL=postgresql+asyncpg://postgres:matkhau123@localhost:5432/mdm_database`

**Bước 3.5. Chạy Migration tạo bảng (Alembic)**
Thay vì tự tạo bảng, hệ thống sẽ tự sinh ra nhờ Alembic:
```bash
alembic upgrade head
```

**Bước 3.6. Chạy Server Backend**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
```
*-> Server sẽ chạy tại: http://localhost:8081*
*-> Xem API Docs (Swagger) tại: http://localhost:8081/swagger-ui.html*

---

## 4. CÀI ĐẶT VÀ CHẠY FRONTEND (WEB DASHBOARD)
Phần Web quản trị nằm trong thư mục `web-dashboard`.

Mở một cửa sổ Terminal MỚI tại thư mục gốc của dự án:
```bash
cd web-dashboard
```

**Bước 4.1. Cài đặt thư viện npm**
```bash
npm install
```

**Bước 4.2. Khởi động Web**
```bash
npm run dev
```
*-> Mở trình duyệt và truy cập: http://localhost:5173*

---

## 💡 CÁCH CHẠY NHANH CẢ FRONTEND LÀ BACKEND TỰ ĐỘNG
Để tiết kiệm thời gian gõ lệnh, hệ thống đã chuẩn bị sẵn file `start_servers.bat` ở thư mục gốc. 
Sau khi đã cài đặt xong các thư viện (`pip install` và `npm install`) ở bước trên, từ nay trở đi, bạn chỉ cần:
1. Nhấp đúp chuột (Double click) vào file `start_servers.bat`
2. Hệ thống sẽ tự động bật 2 cửa sổ CMD màu xanh lá cây để khởi động cả 2 server cùng lúc.

---

## 5. CÀI ĐẶT VÀ CHẠY ANDROID AGENT
Phần ứng dụng dành cho thiết bị học sinh nằm trong thư mục `android-agent`.

1. Mở phần mềm **Android Studio**.
2. Chọn **Open**, trỏ tới thư mục `d:\UTH\UTH_IT\TTTN\Final_Code\Moblie_Device_Management_TTTN\android-agent`.
3. Chờ Android Studio đồng bộ (Sync) Gradle xong.
4. Kết nối điện thoại Android thật (hoặc mở máy ảo Emulator).
5. Đảm bảo điện thoại và máy tính đang **dùng chung một mạng WiFi**.
6. Nhấn nút **Run (Play màu xanh)** trên thanh công cụ của Android Studio.

**⚠️ Lưu ý cực kỳ quan trọng cho Android App:**
- Khi chạy trên máy thật, để máy có thể kết nối với Backend, bạn KHÔNG thể điền URL là `localhost` vì điện thoại không hiểu localhost là gì.
- Bạn cần tìm **địa chỉ IP mạng LAN** của máy tính (Mở CMD gõ `ipconfig` -> Tìm dòng IPv4 Address, ví dụ: `192.168.1.15`).
- Sau khi cài App lên điện thoại, ở màn hình App, bạn nhập URL máy chủ là: `http://192.168.1.15:8081` thì App mới kết nối được.
