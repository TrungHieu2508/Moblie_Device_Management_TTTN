# EduGuardian MDM – API Contract

> **Version:** 1.0.0
> **Base URL:** `http://localhost:8080/api`
> **Content-Type:** `application/json`
> **Swagger UI:** `http://localhost:8080/api/swagger-ui.html`

---

## Standard Response Format

Tất cả API đều trả về cùng một format:

```json
{
  "success": true,
  "message": "Thông báo (tùy chọn)",
  "data": { ... },
  "errorCode": null,
  "timestamp": "2024-08-01T10:00:00Z"
}
```

**Khi lỗi:**
```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "data": null,
  "errorCode": "DEV_001",
  "timestamp": "2024-08-01T10:00:00Z"
}
```

---

## Authentication Headers

- **IT Admin:** `Authorization: Bearer <access_token>`
- **Android Agent:** `Authorization: Device <device_registration_token>`

---

## 1. AUTHENTICATION API

### POST /auth/login
Đăng nhập IT Admin.

**Request:**
```json
{
  "username": "admin",
  "password": "Admin@123456"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "username": "admin",
      "fullName": "Super Administrator",
      "role": "SUPER_ADMIN",
      "schoolId": null
    }
  }
}
```

### POST /auth/refresh
Làm mới Access Token bằng Refresh Token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response 200:** Trả về access token mới.

### POST /auth/logout
Thu hồi Refresh Token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

---

## 2. DEVICE MANAGEMENT API

### POST /devices/register *(Android Agent)*
Agent gọi để đăng ký thiết bị lần đầu tiên.

**Headers:** Không cần Authorization (lần đầu đăng ký)

**Request:**
```json
{
  "deviceId": "ANDROID_ID hoặc UUID sinh bởi Agent",
  "deviceName": "Samsung Galaxy Tab A8",
  "serialNumber": "RF8N12345678",
  "model": "SM-X200",
  "androidVersion": "13.0",
  "agentVersion": "1.0.0",
  "macAddress": "AA:BB:CC:DD:EE:FF"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "deviceUuid": "uuid-của-device-trong-db",
    "registrationToken": "token-để-agent-dùng-cho-các-request-sau",
    "tokenExpiresAt": "2024-09-01T00:00:00Z",
    "serverConfig": {
      "heartbeatIntervalSeconds": 30,
      "websocketUrl": "ws://server:8080/api/ws"
    }
  }
}
```

### GET /devices
Lấy danh sách thiết bị (IT Admin).

**Query Params:**
- `schoolId` (UUID, optional)
- `campusId` (UUID, optional)
- `classroomId` (UUID, optional)
- `status` (DeviceStatus, optional): PENDING, ONLINE, OFFLINE, WARNING, CRITICAL
- `search` (string, optional): Tìm theo deviceName, deviceId, model
- `page` (int, default: 0)
- `size` (int, default: 20)
- `sort` (string, default: "createdAt,desc")

**Response 200:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "deviceId": "ANDROID_ID",
        "deviceName": "Tablet 01",
        "model": "SM-X200",
        "androidVersion": "13.0",
        "agentVersion": "1.0.0",
        "status": "ONLINE",
        "school": { "id": "uuid", "name": "Trường A", "code": "SCHOOL_A" },
        "campus": { "id": "uuid", "name": "Cơ sở 1" },
        "classroom": { "id": "uuid", "name": "Lớp A1", "code": "LAB_01" },
        "lastHeartbeatAt": "2024-08-01T10:00:00Z",
        "metrics": {
          "ramUsagePct": 65.5,
          "cpuUsagePct": 30.2,
          "batteryLevel": 80,
          "currentApp": "com.example.learning"
        }
      }
    ],
    "totalElements": 100,
    "totalPages": 5,
    "size": 20,
    "number": 0
  }
}
```

### GET /devices/{id}
Lấy chi tiết một thiết bị.

**Response 200:** Thông tin đầy đủ của device bao gồm metrics, alert history gần nhất.

### PATCH /devices/{id}/assign
Gán thiết bị vào Trường/Cơ sở/Lớp.

**Request:**
```json
{
  "schoolId": "uuid",
  "campusId": "uuid",
  "classroomId": "uuid",
  "deviceName": "Tablet Lớp A1 - Số 01"
}
```

### PATCH /devices/{id}/unassign
Gỡ thiết bị khỏi Trường/Lớp (trả về PENDING).

### DELETE /devices/{id}
Xóa thiết bị khỏi hệ thống.

---

## 3. HEARTBEAT API

### POST /devices/heartbeat *(Android Agent)*
Agent gửi heartbeat định kỳ (mỗi 30 giây).

**Headers:** `Authorization: Device <registration_token>`

**Request:**
```json
{
  "deviceId": "ANDROID_ID",
  "timestamp": "2024-08-01T10:00:00Z",
  "metrics": {
    "ramTotalMb": 4096,
    "ramUsedMb": 2662,
    "ramUsagePct": 65.0,
    "cpuUsagePct": 30.5,
    "storageTotalGb": 64.0,
    "storageUsedGb": 20.5,
    "batteryLevel": 80,
    "batteryCharging": false,
    "wifiSsid": "School-WiFi-5G",
    "wifiSignal": -55,
    "ipAddress": "192.168.1.100"
  },
  "currentApp": {
    "packageName": "com.example.learning",
    "appName": "EduStar Learning"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "nextHeartbeatSeconds": 30,
    "pendingCommands": 0
  }
}
```

---

## 4. EVENT API

### POST /devices/events *(Android Agent)*
Agent gửi sự kiện bất thường.

**Headers:** `Authorization: Device <registration_token>`

**Request:**
```json
{
  "deviceId": "ANDROID_ID",
  "eventType": "BLACKLIST_APP_DETECTED",
  "occurredAt": "2024-08-01T10:05:00Z",
  "eventData": {
    "packageName": "com.android.chrome",
    "appName": "Chrome",
    "action": "APP_FOREGROUND"
  }
}
```

**Response 201:** Xác nhận đã nhận event.

---

## 5. SCHOOL MANAGEMENT API

### POST /schools
Tạo trường học mới.

**Request:**
```json
{
  "name": "Trung Tâm Anh Ngữ EduStar",
  "code": "EDUSTAR",
  "address": "123 Nguyễn Văn Linh, Q7, TP.HCM",
  "phone": "0901234567",
  "email": "info@edustar.edu.vn"
}
```

### GET /schools
Lấy danh sách trường (có pagination).

### GET /schools/{id}
Lấy chi tiết trường + danh sách cơ sở.

### PUT /schools/{id}
Cập nhật thông tin trường.

### DELETE /schools/{id}
Xóa trường (chỉ được xóa khi không còn thiết bị).

---

## 6. CAMPUS API

### POST /schools/{schoolId}/campuses
Tạo cơ sở mới.

### GET /schools/{schoolId}/campuses
Lấy danh sách cơ sở của trường.

### PUT /campuses/{id}
Cập nhật cơ sở.

### DELETE /campuses/{id}
Xóa cơ sở.

---

## 7. CLASSROOM API

### POST /campuses/{campusId}/classrooms
Tạo lớp học mới.

### GET /campuses/{campusId}/classrooms
Lấy danh sách lớp của cơ sở.

### PUT /classrooms/{id}
Cập nhật lớp học.

### DELETE /classrooms/{id}
Xóa lớp học.

---

## 8. RULE ENGINE API

### POST /rules
Tạo rule mới.

**Request (Blacklist):**
```json
{
  "name": "Cấm Chrome và YouTube",
  "description": "Không cho phép học sinh dùng Chrome và YouTube trong giờ học",
  "ruleType": "APP_BLACKLIST",
  "ruleData": {
    "apps": ["com.android.chrome", "com.google.android.youtube", "com.zhiliaoapp.musically"]
  },
  "schoolId": "uuid",
  "severity": "CRITICAL"
}
```

**Request (RAM Threshold):**
```json
{
  "name": "Cảnh báo RAM cao",
  "ruleType": "RAM_THRESHOLD",
  "ruleData": {
    "threshold": 90
  },
  "severity": "WARNING"
}
```

### GET /rules
Lấy danh sách rule (filter theo schoolId, ruleType, isActive).

### PUT /rules/{id}
Cập nhật rule.

### PATCH /rules/{id}/toggle
Bật/tắt rule.

### DELETE /rules/{id}
Xóa rule.

---

## 9. ALERT CENTER API

### GET /alerts
Lấy danh sách cảnh báo.

**Query Params:**
- `status`: NEW, PROCESSING, RESOLVED, DISMISSED
- `severity`: INFO, WARNING, CRITICAL
- `deviceId`: UUID
- `schoolId`: UUID
- `from`: ISO datetime
- `to`: ISO datetime
- `page`, `size`, `sort`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "alertCode": "BLACKLIST_APP_001",
        "title": "Phát hiện ứng dụng bị cấm",
        "description": "Thiết bị đang chạy Chrome (com.android.chrome)",
        "severity": "CRITICAL",
        "status": "NEW",
        "device": {
          "id": "uuid",
          "deviceName": "Tablet 01",
          "model": "SM-X200"
        },
        "school": { "id": "uuid", "name": "Trường EduStar" },
        "classroom": { "id": "uuid", "name": "Lớp A1" },
        "eventData": {
          "packageName": "com.android.chrome",
          "appName": "Chrome"
        },
        "createdAt": "2024-08-01T10:05:00Z"
      }
    ],
    "totalElements": 50,
    "summary": {
      "newCount": 10,
      "criticalCount": 5
    }
  }
}
```

### GET /alerts/{id}
Lấy chi tiết alert.

### PATCH /alerts/{id}/status
Cập nhật trạng thái alert.

**Request:**
```json
{
  "status": "RESOLVED",
  "resolutionNote": "Đã khóa màn hình và nhắc nhở học sinh"
}
```

### GET /alerts/statistics
Thống kê alert theo trường, theo thời gian.

---

## 10. REMOTE COMMAND API

### POST /commands
Gửi lệnh điều khiển xuống thiết bị.

**Request (SHOW_ALERT):**
```json
{
  "deviceId": "uuid",
  "commandType": "SHOW_ALERT",
  "commandParams": {
    "message": "Hãy tắt Chrome và quay lại ứng dụng học!",
    "title": "Cảnh báo từ IT"
  },
  "alertId": "uuid"
}
```

**Request (OPEN_LEARNING_APP):**
```json
{
  "deviceId": "uuid",
  "commandType": "OPEN_LEARNING_APP",
  "commandParams": {
    "packageName": "com.example.learning"
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "commandId": "uuid",
    "status": "PENDING",
    "message": "Lệnh đã được tạo và sẽ được gửi tới thiết bị"
  }
}
```

### GET /commands/{id}
Kiểm tra trạng thái lệnh.

### GET /commands?deviceId={uuid}
Lấy lịch sử lệnh của thiết bị.

### POST /commands/ack *(Android Agent)*
Agent gửi ACK khi nhận/thực thi lệnh.

**Headers:** `Authorization: Device <registration_token>`

**Request:**
```json
{
  "commandId": "uuid",
  "status": "EXECUTED",
  "executedAt": "2024-08-01T10:06:00Z",
  "errorMessage": null
}
```

---

## 11. LIVE INCIDENT API

### POST /devices/{id}/stream/start
IT Admin yêu cầu thiết bị bắt đầu stream màn hình.
(Server gửi command xuống Agent qua WebSocket)

### POST /devices/{id}/stream/stop
Dừng stream.

---

## 12. REPORTING API

### GET /reports/devices
Báo cáo tổng quan thiết bị.

### GET /reports/alerts
Báo cáo tổng quan alert.

### GET /reports/audit-logs
Lịch sử hành động của IT Admin.

### GET /reports/export/devices
Export danh sách thiết bị (PDF/Excel).

---

## Error Codes Reference

| Code | Ý nghĩa | HTTP Status |
|------|---------|-------------|
| AUTH_001 | Sai username/password | 401 |
| AUTH_002 | Token hết hạn | 401 |
| AUTH_003 | Token không hợp lệ | 401 |
| AUTH_004 | Refresh token hết hạn | 401 |
| AUTH_006 | Không có quyền | 403 |
| DEV_001 | Thiết bị không tồn tại | 404 |
| DEV_002 | Thiết bị đã đăng ký | 409 |
| DEV_005 | Thiết bị offline | 503 |
| SCH_001 | Trường không tồn tại | 404 |
| SCH_002 | Mã trường đã tồn tại | 409 |
| ALT_001 | Alert không tồn tại | 404 |
| CMD_001 | Command không tồn tại | 404 |
| VAL_001 | Validation thất bại | 400 |
| SYS_001 | Lỗi hệ thống | 500 |
