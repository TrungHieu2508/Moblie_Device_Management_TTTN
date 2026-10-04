"""
Python Enums — Tương đương tất cả Java Enums trong dự án.

Sử dụng Python str + Enum để giá trị enum tự động serialize
thành chuỗi trong JSON responses (không cần custom serializer).
"""

import enum


# ── User ──────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    TEACHER = "TEACHER"
    IT_ADMIN = "IT_ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


# ── Device ────────────────────────────────────────────────────

class DeviceStatus(str, enum.Enum):
    """
    Vòng đời thiết bị:
    PENDING → ONLINE → OFFLINE → ONLINE → ... (warning/critical khi có vi phạm)
    """
    PENDING = "PENDING"        # Vừa đăng ký, chưa gán trường/lớp
    ONLINE = "ONLINE"          # Đang kết nối, hoạt động bình thường
    OFFLINE = "OFFLINE"        # Mất kết nối
    WARNING = "WARNING"        # Có cảnh báo nhưng vẫn kết nối
    CRITICAL = "CRITICAL"      # Vi phạm nghiêm trọng hoặc lỗi hệ thống


# ── Command ───────────────────────────────────────────────────

class CommandType(str, enum.Enum):
    """Loại lệnh điều khiển từ xa."""
    LOCK_SCREEN = "LOCK_SCREEN"
    RING_ALARM = "RING_ALARM"
    WIPE_DATA = "WIPE_DATA"
    REBOOT_DEVICE = "REBOOT_DEVICE"
    CLEAR_BACKGROUND_APPS = "CLEAR_BACKGROUND_APPS"
    OPEN_APP = "OPEN_APP"
    OPEN_URL = "OPEN_URL"
    SHOW_ALERT = "SHOW_ALERT"
    SHOW_VIOLATION_LOCK = "SHOW_VIOLATION_LOCK"
    UNLOCK_DEVICE = "UNLOCK_DEVICE"
    HIDE_APP = "HIDE_APP"
    BLOCK_UNINSTALL = "BLOCK_UNINSTALL"
    DISABLE_CAMERA = "DISABLE_CAMERA"
    DISABLE_FACTORY_RESET = "DISABLE_FACTORY_RESET"
    START_STREAM = "START_STREAM"


class CommandStatus(str, enum.Enum):
    """
    Vòng đời: PENDING → SENT → ACKNOWLEDGED → EXECUTED (hoặc FAILED/EXPIRED)
    """
    PENDING = "PENDING"
    SENT = "SENT"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


# ── Event ─────────────────────────────────────────────────────

class EventType(str, enum.Enum):
    """Loại Event gửi từ Android Agent lên Server."""
    APP_OPENED = "APP_OPENED"
    APP_CLOSED = "APP_CLOSED"
    BLACKLIST_APP_DETECTED = "BLACKLIST_APP_DETECTED"
    UNKNOWN_APP_DETECTED = "UNKNOWN_APP_DETECTED"
    RAM_HIGH = "RAM_HIGH"
    CPU_HIGH = "CPU_HIGH"
    BATTERY_LOW = "BATTERY_LOW"
    WIFI_DISCONNECTED = "WIFI_DISCONNECTED"
    DEVICE_OFFLINE = "DEVICE_OFFLINE"
    DEVICE_ONLINE = "DEVICE_ONLINE"
    QUICK_RECOVERY_TRIGGERED = "QUICK_RECOVERY_TRIGGERED"


# ── Rule ──────────────────────────────────────────────────────

class RuleType(str, enum.Enum):
    """Loại Rule trong Rule Engine."""
    APP_WHITELIST = "APP_WHITELIST"
    APP_BLACKLIST = "APP_BLACKLIST"
    RAM_THRESHOLD = "RAM_THRESHOLD"
    CPU_THRESHOLD = "CPU_THRESHOLD"
    BATTERY_LOW = "BATTERY_LOW"
    OFFLINE_DETECT = "OFFLINE_DETECT"


# ── Alert ─────────────────────────────────────────────────────

class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AlertStatus(str, enum.Enum):
    """Vòng đời: NEW → PROCESSING → RESOLVED (hoặc DISMISSED)"""
    NEW = "NEW"
    PROCESSING = "PROCESSING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"
