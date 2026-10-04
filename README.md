# EduGuardian MDM

> **Hệ thống Mobile Device Management dành cho môi trường giáo dục**
> Quản lý và giám sát thiết bị Android (Samsung Tablet) theo thời gian thực

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────┐
│    Android Agent        │────▶│    MDM Server            │────▶│   IT Dashboard       │
│    (Kotlin/Device Owner)│◀────│    (Python/FastAPI)      │◀────│   (React/TypeScript) │
│                         │     │                          │     │                      │
│  • Foreground Service   │     │  • Async REST API        │     │  • Device Monitor    │
│  • Pure WebSocket       │     │  • Pure WebSocket        │     │  • Alert Center      │
│  • Event Detection      │     │  • Rule Engine           │     │  • Remote Control    │
│  • UsageStatsManager    │     │  • Alert Center          │     │  • 3D Map            │
└─────────────────────────┘     │                          │     └──────────────────────┘
                                │  ┌──────────┐            │
                                │  │PostgreSQL│            │
                                │  └──────────┘            │
                                └──────────────────────────┘
```

## 📁 Cấu trúc thư mục

```
Moblie_Device_Management_TTTN/
├── android-agent/              # Thành viên A - Android Agent (Kotlin)
├── MDM-server/                 # Thành viên B - Backend (Python FastAPI)
│   ├── app/                    # Mã nguồn chính
│   │   ├── api/                # REST API Routers
│   │   ├── core/               # Configuration, Security
│   │   ├── db/                 # Database config (SQLAlchemy)
│   │   ├── models/             # Database Models
│   │   ├── schemas/            # Pydantic schemas cho API
│   │   ├── services/           # Business logic
│   │   └── ws/                 # WebSocket Endpoint (Connection Manager, Notifier)
│   ├── alembic/                # Database migrations
│   ├── requirements.txt        # Thư viện Python
│   └── start_servers.bat       # Script khởi động tự động
├── web-dashboard/              # Thành viên B - Frontend (React/TypeScript)
│   ├── src/                    # Component, Hooks, API Services
│   ├── package.json            # Thư viện Node.js
│   └── vite.config.ts          # Cấu hình Vite
├── docs/                       # Tài liệu kỹ thuật
├── docker-compose.yml          # PostgreSQL Server
└── README.md
```

## 🚀 Khởi động Development Environment

### Yêu cầu
- Docker Desktop
- Python 3.10+
- Node.js 20+
- Android Studio (Để cài đặt Agent)

### 1. Khởi động Database

```bash
docker compose up -d
```

### 2. Chạy Backend và Frontend Tự động

Chúng tôi đã chuẩn bị sẵn Script `start_servers.bat` để chạy cả Backend và Frontend chỉ với 1 thao tác. 

Từ thư mục gốc, click đúp vào file `start_servers.bat` (chỉ hỗ trợ trên Windows). File sẽ tự động:
- Cài đặt thư viện Python (nếu chưa có) vào `.venv`.
- Cài đặt thư viện Node.js (nếu chưa có).
- Khởi động Backend (FastAPI) ở port 8081.
- Khởi động Frontend (React) ở port 5173.

Hoặc bạn có thể chạy thủ công:
**Backend:**
```bash
cd MDM-server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
```

**Frontend:**
```bash
cd web-dashboard
npm install
npm run dev
```

---

## 🔑 Thông tin đăng nhập mặc định

| Service | URL | Username | Password |
|---------|-----|----------|---------|
| IT Dashboard | http://localhost:5173 | superadmin | admin123 |
| Swagger API | http://localhost:8081/docs | - | - |
| pgAdmin | http://localhost:5050 | admin@eduguardian.vn | admin123 |

---

## 📋 Tech Stack

### Backend
- **Python 3.10+** + **FastAPI**
- **SQLAlchemy 2.0** + **asyncpg**
- **Alembic** (Database Migration)
- **WebSockets** (Pure WebSocket, không dùng STOMP)
- **PyJWT**, **Passlib**

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Ant Design 6** + **TailwindCSS**
- **Zustand** (State management)
- **React Query** (Data fetching)
- **Recharts** (Charts)
- **Three.js** + **React Three Fiber** (Mô hình 3D Trường học)

### Infrastructure
- **Docker** + **Docker Compose**
- **PostgreSQL 17** (Primary Database)

---

## 📱 Hướng dẫn cài đặt Android Agent

Để máy tính và thiết bị (hoặc máy ảo) có thể kết nối được:
1. Mở Project `android-agent` bằng Android Studio.
2. Build và Install App lên Máy ảo (Emulator) hoặc máy thật.
3. Để cấp quyền **Device Owner** (Bắt buộc), mở Terminal của Android Studio và gõ lệnh:
   ```bash
   adb shell dpm set-device-owner com.edusphere.agent/.receiver.MDMAdminReceiver
   ```
4. Trên App sẽ hiển thị trạng thái "Active". Sau đó nhập Mã Ghi Danh (Lấy từ Dashboard) để tham gia hệ thống.

---

## 👥 Phân công

| Thành viên | Trách nhiệm |
|-----------|------------|
| Thành viên A | Android Agent (Kotlin + Device Owner) |
| Thành viên B | Backend (Python FastAPI) + IT Dashboard (React) |
