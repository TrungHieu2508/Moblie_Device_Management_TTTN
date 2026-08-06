package com.edusphere.mdmserver.domain.device.enums;

/**
 * Trạng thái của thiết bị trong hệ thống.
 *
 * Vòng đời thiết bị:
 * PENDING → ONLINE → OFFLINE → ONLINE → ... (warning/critical khi có vi phạm)
 * PENDING = mới đăng ký, chưa được IT Admin gán trường/lớp
 */
public enum DeviceStatus {
    PENDING,    // Vừa đăng ký, chưa gán trường/lớp
    ONLINE,     // Đang kết nối, hoạt động bình thường
    OFFLINE,    // Mất kết nối (không nhận heartbeat trong X giây)
    WARNING,    // Có cảnh báo nhưng vẫn kết nối
    CRITICAL    // Vi phạm nghiêm trọng hoặc lỗi hệ thống
}
