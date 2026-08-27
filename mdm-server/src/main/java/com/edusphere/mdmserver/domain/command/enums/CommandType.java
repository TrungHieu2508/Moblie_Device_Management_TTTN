package com.edusphere.mdmserver.domain.command.enums;

/**
 * Loại lệnh điều khiển từ xa.
 * Ánh xạ với command_type ENUM trong PostgreSQL.
 */
public enum CommandType {
    LOCK_SCREEN,            // Khóa màn hình thiết bị
    RING_ALARM,             // Phát âm thanh cảnh báo
    WIPE_DATA,              // Xóa dữ liệu thiết bị
    REBOOT_DEVICE,          // Khởi động lại thiết bị
    CLEAR_BACKGROUND_APPS,  // Xóa ứng dụng chạy nền
    OPEN_APP,               // Mở ứng dụng theo package name
    OPEN_URL,               // Mở trình duyệt với URL
    SHOW_ALERT,             // Hiển thị thông báo trên màn hình
    SHOW_VIOLATION_LOCK,    // Bật màn hình phạt (Kiosk Mode)
    UNLOCK_DEVICE,          // Mở khóa màn hình phạt
    HIDE_APP,               // Ẩn ứng dụng
    BLOCK_UNINSTALL,        // Cấm gỡ cài đặt
    DISABLE_CAMERA,         // Tắt camera
    DISABLE_FACTORY_RESET,  // Cấm khôi phục cài đặt gốc
    START_STREAM            // Xem màn hình trực tiếp
}
