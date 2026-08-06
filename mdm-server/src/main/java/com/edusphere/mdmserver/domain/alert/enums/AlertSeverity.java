package com.edusphere.mdmserver.domain.alert.enums;

/**
 * Mức độ nghiêm trọng của Alert.
 * Ánh xạ trực tiếp với alert_severity ENUM trong PostgreSQL.
 */
public enum AlertSeverity {
    INFO,       // Thông tin, không cần xử lý ngay
    WARNING,    // Cảnh báo, cần chú ý
    CRITICAL    // Nghiêm trọng, cần xử lý ngay lập tức
}
