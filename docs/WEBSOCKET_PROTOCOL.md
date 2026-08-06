# EduGuardian MDM – WebSocket Protocol

> **Version:** 1.0.0
> **Protocol:** STOMP over WebSocket
> **Endpoint:** `ws://server:8080/api/ws`
> **SockJS fallback:** `http://server:8080/api/ws`

---

## Kết Nối

### Client (Dashboard) kết nối:
```javascript
// SockJS + STOMP
const socket = new SockJS('/api/ws');
const stompClient = new Client({
  webSocketFactory: () => socket,
  connectHeaders: {
    Authorization: `Bearer ${accessToken}`
  },
  onConnect: () => {
    // Subscribe các topic sau khi connect thành công
  }
});
```

### Android Agent kết nối:
```
URL: ws://server:8080/api/ws/agent
Header: Authorization: Device <registration_token>
```

---

## STOMP Topic Structure

```
/topic/devices/{deviceId}/status     ← Server → Dashboard: Cập nhật status device
/topic/devices/{deviceId}/metrics    ← Server → Dashboard: Cập nhật metrics realtime
/topic/devices/{deviceId}/command    ← Server → Agent: Gửi lệnh xuống
/topic/alerts/new                    ← Server → Dashboard: Có alert mới
/topic/alerts/{alertId}/status       ← Server → Dashboard: Alert thay đổi status
/user/queue/commands/ack             ← Agent → Server: ACK lệnh đã nhận/thực thi
/app/agent/heartbeat                 ← Agent → Server: Gửi heartbeat qua WS (optional)
/app/agent/event                     ← Agent → Server: Gửi event qua WS (optional)
```

---

## 1. DEVICE STATUS UPDATE

**Topic:** `/topic/devices/{deviceId}/status`

**Publisher:** Server (khi nhận heartbeat hoặc phát hiện offline)

**Payload (Dashboard nhận):**
```json
{
  "deviceId": "uuid",
  "status": "ONLINE",
  "changedAt": "2024-08-01T10:00:00Z",
  "reason": null
}
```

**status values:**
- `ONLINE` – Vừa nhận được heartbeat
- `OFFLINE` – Không nhận heartbeat trong 90 giây
- `WARNING` – Có cảnh báo mới
- `CRITICAL` – Có vi phạm nghiêm trọng

---

## 2. DEVICE METRICS UPDATE

**Topic:** `/topic/devices/{deviceId}/metrics`

**Publisher:** Server (sau khi xử lý heartbeat)

**Payload (Dashboard nhận):**
```json
{
  "deviceId": "uuid",
  "timestamp": "2024-08-01T10:00:00Z",
  "ramUsagePct": 65.5,
  "cpuUsagePct": 30.2,
  "batteryLevel": 80,
  "batteryCharging": false,
  "wifiSsid": "School-WiFi-5G",
  "wifiSignal": -55,
  "ipAddress": "192.168.1.100",
  "currentApp": {
    "packageName": "com.example.learning",
    "appName": "EduStar Learning"
  }
}
```

---

## 3. REMOTE COMMAND DISPATCH

**Topic:** `/topic/devices/{deviceId}/command`

**Publisher:** Server (khi IT Admin gửi lệnh)

**Payload (Android Agent nhận):**
```json
{
  "commandId": "uuid",
  "commandType": "SHOW_ALERT",
  "commandParams": {
    "title": "Cảnh báo từ IT",
    "message": "Hãy tắt Chrome và quay lại ứng dụng học!"
  },
  "issuedAt": "2024-08-01T10:05:30Z",
  "expiresAt": "2024-08-01T10:15:30Z"
}
```

**commandType values:**
- `SHOW_ALERT` – params: `{title, message}`
- `LOCK_SCREEN` – params: `{}`
- `OPEN_LEARNING_APP` – params: `{packageName}`
- `RESTART_LEARNING_APP` – params: `{packageName}`
- `REBOOT_DEVICE` – params: `{}`
- `QUICK_RECOVERY` – params: `{learningAppPackage}`
- `CLEAR_BACKGROUND_APPS` – params: `{}`

---

## 4. COMMAND ACK

**Topic:** `/app/commands/ack` (Agent gửi lên Server)

**Publisher:** Android Agent

**Payload:**
```json
{
  "commandId": "uuid",
  "deviceId": "ANDROID_ID",
  "status": "EXECUTED",
  "executedAt": "2024-08-01T10:05:35Z",
  "errorMessage": null
}
```

**status values:**
- `ACKNOWLEDGED` – Agent đã nhận lệnh
- `EXECUTED` – Agent đã thực thi thành công
- `FAILED` – Agent thực thi thất bại (kèm errorMessage)

---

## 5. NEW ALERT NOTIFICATION

**Topic:** `/topic/alerts/new`

**Publisher:** Server (khi Rule Engine sinh Alert mới)

**Payload (Dashboard nhận):**
```json
{
  "alertId": "uuid",
  "alertCode": "BLACKLIST_APP_001",
  "title": "Phát hiện ứng dụng bị cấm",
  "description": "Thiết bị Tablet 01 (Lớp A1) đang chạy Chrome",
  "severity": "CRITICAL",
  "status": "NEW",
  "deviceId": "uuid",
  "deviceName": "Tablet 01",
  "schoolId": "uuid",
  "schoolName": "Trường EduStar",
  "classroomName": "Lớp A1",
  "eventData": {
    "packageName": "com.android.chrome",
    "appName": "Chrome"
  },
  "createdAt": "2024-08-01T10:05:00Z"
}
```

---

## 6. ALERT STATUS CHANGE

**Topic:** `/topic/alerts/{alertId}/status`

**Publisher:** Server (khi IT Admin cập nhật status alert)

**Payload:**
```json
{
  "alertId": "uuid",
  "status": "RESOLVED",
  "resolvedBy": "admin",
  "resolvedAt": "2024-08-01T10:10:00Z"
}
```

---

## 7. LIVE INCIDENT STREAM

**Topic:** `/topic/devices/{deviceId}/screen`

**Publisher:** Android Agent → Server → Dashboard (relay)

**Payload:**
```json
{
  "deviceId": "uuid",
  "timestamp": "2024-08-01T10:06:00Z",
  "imageData": "base64_encoded_screenshot_jpeg",
  "width": 1280,
  "height": 800,
  "quality": 70
}
```

> ⚠️ Chỉ được publish khi IT Admin đã yêu cầu xem trực tiếp.
> Khi IT Admin đóng cửa sổ, Server gửi lệnh xuống Agent để DỪNG stream.

---

## Error Handling (WebSocket)

Khi WebSocket bị disconnect:
- Dashboard: Tự động reconnect sau 3 giây, tối đa 5 lần
- Android Agent: Tự động reconnect theo exponential backoff (3s → 6s → 12s → ...)

Khi token hết hạn:
- Dashboard: Refresh token và reconnect
- Agent: Sử dụng registration token (30 ngày) – ít khi hết hạn

---

## Dashboard Subscription Strategy

```javascript
// Subscribe khi login
stompClient.subscribe('/topic/alerts/new', handleNewAlert);

// Subscribe khi mở Device List
stompClient.subscribe('/topic/devices/+/status', handleDeviceStatusChange);

// Subscribe khi mở Device Detail
stompClient.subscribe(`/topic/devices/${deviceId}/metrics`, handleMetricsUpdate);

// Subscribe khi mở Live Incident View
stompClient.subscribe(`/topic/devices/${deviceId}/screen`, handleScreenFrame);

// Unsubscribe khi đóng trang
subscription.unsubscribe();
```
