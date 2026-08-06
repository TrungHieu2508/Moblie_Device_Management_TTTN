# EduGuardian MDM – ERD Documentation

> Tài liệu mô tả thiết kế cơ sở dữ liệu PostgreSQL
> Version: 1.0.0

---

## ERD Diagram (Text Format)

```
schools
├── id (UUID PK)
├── name
├── code (UNIQUE)
├── address
├── phone
├── email
├── is_active
├── created_at
└── updated_at
    │
    └──< campuses
         ├── id (UUID PK)
         ├── school_id (FK → schools.id)
         ├── name
         ├── code (UNIQUE)
         ├── address
         ├── is_active
         ├── created_at
         └── updated_at
              │
              └──< classrooms
                   ├── id (UUID PK)
                   ├── campus_id (FK → campuses.id)
                   ├── name
                   ├── code (UNIQUE)
                   ├── capacity
                   ├── is_active
                   ├── created_at
                   └── updated_at

users
├── id (UUID PK)
├── username (UNIQUE)
├── email (UNIQUE)
├── password_hash
├── full_name
├── role (ENUM: IT_ADMIN, SUPER_ADMIN)
├── school_id (FK → schools.id, nullable)
├── is_active
├── last_login_at
├── created_at
└── updated_at
    │
    └──< refresh_tokens
         ├── id (UUID PK)
         ├── user_id (FK → users.id)
         ├── token (UNIQUE)
         ├── expires_at
         ├── is_revoked
         └── created_at

devices
├── id (UUID PK)
├── device_id (UNIQUE) ← Android ANDROID_ID
├── device_name
├── serial_number
├── model
├── android_version
├── agent_version
├── school_id (FK → schools.id, nullable)
├── campus_id (FK → campuses.id, nullable)
├── classroom_id (FK → classrooms.id, nullable)
├── status (ENUM: PENDING, ONLINE, OFFLINE, WARNING, CRITICAL)
├── registration_token
├── last_heartbeat_at
├── registered_at
├── updated_at
└── notes
    │
    ├──1 device_metrics (1-1)
    │   ├── id (UUID PK)
    │   ├── device_id (FK → devices.id, UNIQUE)
    │   ├── ram_total_mb, ram_used_mb, ram_usage_pct
    │   ├── cpu_usage_pct
    │   ├── storage_total_gb, storage_used_gb
    │   ├── battery_level, battery_charging
    │   ├── wifi_ssid, wifi_signal
    │   ├── ip_address
    │   ├── current_app, current_app_name
    │   └── updated_at
    │
    ├──< heartbeat_logs (1-N, partitioned by received_at)
    │   ├── id (BIGSERIAL PK)
    │   ├── device_id (FK → devices.id)
    │   ├── ram_usage_pct, cpu_usage_pct
    │   ├── battery_level, wifi_connected
    │   ├── current_app, ip_address
    │   └── received_at
    │
    ├──< device_events (1-N)
    │   ├── id (BIGSERIAL PK)
    │   ├── device_id (FK → devices.id)
    │   ├── event_type (ENUM)
    │   ├── event_data (JSONB)
    │   ├── occurred_at
    │   ├── processed
    │   └── processed_at
    │
    └──< remote_commands (1-N)
        ├── id (UUID PK)
        ├── device_id (FK → devices.id)
        ├── issued_by (FK → users.id)
        ├── alert_id (FK → alerts.id, nullable)
        ├── command_type (ENUM)
        ├── command_params (JSONB)
        ├── status (ENUM)
        ├── expires_at, sent_at, acknowledged_at, executed_at
        ├── error_message
        └── created_at

rules
├── id (UUID PK)
├── name, description
├── rule_type (ENUM)
├── rule_data (JSONB)
├── school_id (FK → schools.id, nullable = Global)
├── severity (ENUM)
├── is_active
├── created_by (FK → users.id)
├── created_at
└── updated_at

alerts
├── id (UUID PK)
├── alert_code
├── title, description
├── severity (ENUM)
├── status (ENUM)
├── device_id (FK → devices.id)
├── school_id, campus_id, classroom_id (FK, nullable)
├── rule_id (FK → rules.id, nullable)
├── event_id (FK → device_events.id, nullable)
├── event_data (JSONB snapshot)
├── resolved_by (FK → users.id, nullable)
├── resolved_at, resolution_note
├── created_at
└── updated_at

audit_logs
├── id (BIGSERIAL PK)
├── user_id (FK → users.id)
├── action
├── entity_type, entity_id
├── details (JSONB)
├── ip_address
└── created_at
```

---

## Giải thích các quyết định thiết kế

### 1. Tại sao dùng UUID cho primary key?
- **Security**: Không thể đoán ID của record khác
- **Scalability**: Có thể sinh ID ở client mà không cần round-trip to DB
- **Phù hợp phân tán**: Khi mở rộng multi-database sau này

### 2. Tại sao heartbeat_logs dùng BIGSERIAL thay vì UUID?
- Bảng HIGH-WRITE (hàng nghìn record/phút)
- BIGSERIAL insert nhanh hơn UUID (index B-tree tốt hơn với sequential int)
- Không cần expose ID này ra ngoài API

### 3. Tại sao heartbeat_logs dùng Partition by Range?
- Dữ liệu heartbeat tăng rất nhanh (30s/device × 100 devices = 8,640 records/giờ)
- Partition theo tháng giúp:
  - Query nhanh hơn (chỉ scan partition cần thiết)
  - Dễ xóa dữ liệu cũ (DROP partition thay vì DELETE từng row)
  - Maintain dễ hơn

### 4. Tại sao rule_data dùng JSONB?
- Mỗi loại Rule có cấu trúc dữ liệu khác nhau
- JSONB cho phép flexible schema mà vẫn có thể index và query
- Dễ thêm loại Rule mới trong tương lai mà không cần ALTER TABLE

### 5. Tại sao có device_metrics riêng biệt với heartbeat_logs?
- **device_metrics**: Snapshot HIỆN TẠI, cập nhật theo heartbeat, 1-1 với device
  - Dùng cho: Hiển thị trạng thái realtime trên Dashboard
- **heartbeat_logs**: Lịch sử đầy đủ
  - Dùng cho: Báo cáo, phân tích trend, debug

### 6. Tại sao alerts snapshot event_data?
- Alert cần lưu lại context TẠI THỜI ĐIỂM xảy ra
- Event data có thể thay đổi hoặc bị xóa sau này
- Snapshot đảm bảo audit trail chính xác

---

## Index Strategy

| Bảng | Index | Lý do |
|------|-------|-------|
| devices | device_id | Agent register/heartbeat lookup |
| devices | school_id, campus_id, classroom_id | Filter devices |
| devices | status | Filter by status |
| devices | last_heartbeat_at | Offline detection query |
| device_events | device_id, occurred_at DESC | Lấy event mới nhất |
| device_events | processed WHERE false | Batch processing queue |
| alerts | status | Filter new/processing alerts |
| alerts | severity | Filter critical alerts |
| alerts | created_at DESC | Lấy alert mới nhất |
| remote_commands | device_id, status | Pending commands for device |
| refresh_tokens | token | Token validation |

---

## Redis Keys Design

```
# Device Heartbeat Status (TTL: 120s)
device:{deviceId}:heartbeat    → JSON { status, lastSeen, metrics... }

# Device Registration Token (TTL: 30 days)
device:{deviceId}:token        → registration_token_string

# Pending Commands Queue
device:{deviceId}:commands     → List of command UUIDs

# Alert Counter (for statistics)
alert:count:critical           → Integer
alert:count:warning            → Integer

# WebSocket Session tracking
ws:session:{sessionId}         → deviceId
device:{deviceId}:session      → sessionId
```

---

## Data Retention Policy

| Bảng | Retention | Chiến lược |
|------|-----------|-----------|
| heartbeat_logs | 3 tháng | DROP old partitions monthly |
| device_events | 6 tháng | Scheduled DELETE |
| audit_logs | 1 năm | Archive to cold storage |
| alerts | 1 năm | Keep all, archive resolved |
| remote_commands | 6 tháng | Scheduled DELETE |
