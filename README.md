# EduGuardian MDM

> **Hệ thống Mobile Device Management dành cho môi trường giáo dục**
> Quản lý và giám sát thiết bị Android (Samsung Tablet) theo thời gian thực

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────┐
│    Android Agent        │────▶│    MDM Server            │────▶│   IT Dashboard       │
│    (Kotlin/Device Owner)│◀────│    (Spring Boot)         │◀────│   (React/TypeScript) │
│                         │     │                          │     │                      │
│  • Foreground Service   │     │  • REST API              │     │  • Device Monitor    │
│  • WorkManager          │     │  • WebSocket (STOMP)     │     │  • Alert Center      │
│  • UsageStatsManager    │     │  • Rule Engine           │     │  • Remote Control    │
│  • Event Detection      │     │  • Alert Center          │     │  • Statistics        │
└─────────────────────────┘     │                          │     └──────────────────────┘
                                │  ┌──────────┐ ┌───────┐ │
                                │  │PostgreSQL│ │ Redis │ │
                                │  └──────────┘ └───────┘ │
                                └──────────────────────────┘
```

## 📁 Cấu trúc thư mục

```
Moblie_Device_Management_TTTN/
├── android-agent/              # Thành viên A - Android Agent (Kotlin)
├── mdm-server/                 # Thành viên B - Backend (Spring Boot)
│   └── src/main/java/com/edusphere/mdmserver/
│       ├── common/             # Shared utilities
│       │   ├── entity/         # BaseEntity
│       │   ├── exception/      # ErrorCode, MdmException, GlobalExceptionHandler
│       │   └── response/       # ApiResponse<T>
│       ├── domain/             # Business domains
│       │   ├── auth/           # Authentication & JWT
│       │   ├── device/         # Device management + Heartbeat
│       │   ├── school/         # School, Campus, Classroom
│       │   ├── alert/          # Alert Center
│       │   ├── command/        # Remote Commands
│       │   ├── rule/           # Rule Engine
│       │   ├── event/          # Device Events
│       │   └── report/         # Reporting
│       ├── infrastructure/     # Technical concerns
│       │   ├── config/         # Spring config classes
│       │   ├── security/       # Security & JWT implementation
│       │   ├── redis/          # Redis configuration & repositories
│       │   └── websocket/      # WebSocket configuration
│       └── MdmServerApplication.java
├── web-dashboard/              # Thành viên B - Frontend (React/TypeScript)
├── docs/                       # Tài liệu kỹ thuật
│   ├── ERD.md                  # Database design
│   ├── API_CONTRACT.md         # REST API specification
│   └── WEBSOCKET_PROTOCOL.md  # WebSocket protocol spec
├── docker-compose.yml          # PostgreSQL + Redis
└── README.md
```

## 🚀 Khởi động Development Environment

### Yêu cầu
- Docker Desktop
- JDK 17+
- Node.js 20+
- Maven 3.9+

### 1. Khởi động Database & Redis

```bash
# Chỉ PostgreSQL + Redis
docker compose up -d

# Bao gồm pgAdmin và Redis Commander (công cụ quản trị)
docker compose --profile dev up -d
```

### 2. Chạy Backend

```bash
cd mdm-server
./mvnw spring-boot:run
```

Backend sẽ chạy tại: `http://localhost:8081/api`
Swagger UI: `http://localhost:8081/api/swagger-ui.html`

### 3. Chạy Frontend

```bash
cd web-dashboard
npm install
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

---

## 🔑 Thông tin đăng nhập mặc định

| Service | URL | Username | Password |
|---------|-----|----------|---------|
| IT Dashboard | http://localhost:5173 | admin | Admin@123456 |
| Swagger UI | http://localhost:8081/api/swagger-ui.html | - | - |
| pgAdmin | http://localhost:5050 | admin@eduguardian.vn | admin123 |
| Redis Commander | http://localhost:8081 | - | - |

---

## 📋 Tech Stack

### Backend
- **Java 17** + **Spring Boot 3.3**
- **Spring Security** + **JJWT** (JWT)
- **Spring Data JPA** + **PostgreSQL 16**
- **Spring Data Redis** + **Lettuce**
- **Spring WebSocket** + **STOMP**
- **Flyway** (Database Migration)
- **SpringDoc OpenAPI** (Swagger UI)
- **Lombok** + **MapStruct**

### Frontend
- **React 19** + **TypeScript**
- **Vite**
- **Ant Design 6**
- **Axios** + **React Query**
- **SockJS** + **STOMP.js** (WebSocket)
- **Recharts** (Charts)

### Infrastructure
- **Docker** + **Docker Compose**
- **PostgreSQL 16** (Primary Database)
- **Redis 7** (Cache + Message Broker)

---

## 📚 Tài liệu

- [ERD & Database Design](docs/ERD.md)
- [REST API Contract](docs/API_CONTRACT.md)
- [WebSocket Protocol](docs/WEBSOCKET_PROTOCOL.md)

---

## 👥 Phân công

| Thành viên | Trách nhiệm |
|-----------|------------|
| Thành viên A | Android Agent (Kotlin + Device Owner) |
| Thành viên B | Backend (Spring Boot) + IT Dashboard (React) |
