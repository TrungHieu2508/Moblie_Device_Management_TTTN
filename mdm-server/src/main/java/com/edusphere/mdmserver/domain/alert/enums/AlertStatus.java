package com.edusphere.mdmserver.domain.alert.enums;

/**
 * Trạng thái xử lý Alert.
 * Vòng đời: NEW → PROCESSING → RESOLVED (hoặc DISMISSED)
 */
public enum AlertStatus {
    NEW,        // Mới tạo, chưa có ai xử lý
    PROCESSING, // IT Admin đang xử lý
    RESOLVED,   // Đã xử lý thành công
    DISMISSED   // Bỏ qua (false alarm hoặc không cần xử lý)
}
