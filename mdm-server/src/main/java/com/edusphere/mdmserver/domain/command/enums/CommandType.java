package com.edusphere.mdmserver.domain.command.enums;

/**
 * Loại lệnh điều khiển từ xa.
 * Ánh xạ với command_type ENUM trong PostgreSQL.
 */
public enum CommandType {
    SHOW_ALERT,             // Hiển thị thông báo cảnh báo trên màn hình tablet
    LOCK_SCREEN,            // Khóa màn hình thiết bị
    OPEN_LEARNING_APP,      // Mở ứng dụng học tập
    RESTART_LEARNING_APP,   // Khởi động lại ứng dụng học tập
    REBOOT_DEVICE,          // Khởi động lại thiết bị
    QUICK_RECOVERY,         // Phục hồi nhanh (restart app + reconnect + check WiFi)
    CLEAR_BACKGROUND_APPS   // Xóa các app chạy nền để giải phóng RAM
}
