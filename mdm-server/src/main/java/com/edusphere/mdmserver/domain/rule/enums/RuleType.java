package com.edusphere.mdmserver.domain.rule.enums;

/**
 * Loại Rule trong Rule Engine.
 * Mỗi loại rule có cấu trúc rule_data khác nhau trong JSONB.
 *
 * rule_data examples:
 * - APP_WHITELIST: {"apps": ["com.example.learning", "com.example.browser"]}
 * - APP_BLACKLIST: {"apps": ["com.android.chrome", "com.google.youtube"]}
 * - RAM_THRESHOLD: {"threshold": 90}              // % RAM
 * - CPU_THRESHOLD: {"threshold": 80}              // % CPU
 * - BATTERY_LOW:   {"threshold": 15}              // % battery
 * - OFFLINE_DETECT: {"thresholdSeconds": 90}      // giây không nhận heartbeat
 */
public enum RuleType {
    APP_WHITELIST,      // Danh sách ứng dụng ĐƯỢC PHÉP
    APP_BLACKLIST,      // Danh sách ứng dụng BỊ CẤM
    RAM_THRESHOLD,      // Ngưỡng RAM (%)
    CPU_THRESHOLD,      // Ngưỡng CPU (%)
    BATTERY_LOW,        // Pin yếu (%)
    OFFLINE_DETECT      // Phát hiện mất kết nối (giây)
}
