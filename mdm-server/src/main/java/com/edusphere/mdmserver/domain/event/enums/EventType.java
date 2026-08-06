package com.edusphere.mdmserver.domain.event.enums;

/**
 * Loại Event gửi từ Android Agent lên Server.
 * Event là trigger để Rule Engine đánh giá và sinh Alert.
 */
public enum EventType {
    APP_OPENED,                 // Ứng dụng vừa được mở
    APP_CLOSED,                 // Ứng dụng vừa bị đóng
    BLACKLIST_APP_DETECTED,     // Phát hiện ứng dụng trong blacklist đang chạy
    UNKNOWN_APP_DETECTED,       // Phát hiện ứng dụng không nằm trong whitelist cũng không có trong blacklist
    RAM_HIGH,                   // RAM vượt ngưỡng cho phép
    CPU_HIGH,                   // CPU vượt ngưỡng cho phép
    BATTERY_LOW,                // Pin xuống dưới ngưỡng
    WIFI_DISCONNECTED,          // Mất kết nối WiFi
    DEVICE_OFFLINE,             // Thiết bị mất kết nối server (do server tự phát hiện)
    DEVICE_ONLINE,              // Thiết bị kết nối lại
    QUICK_RECOVERY_TRIGGERED    // Agent đã tự kích hoạt Quick Recovery
}
