package com.edusphere.mdmserver.domain.command.enums;

/**
 * Trạng thái vòng đời của Remote Command.
 * Vòng đời: PENDING → SENT → ACKNOWLEDGED → EXECUTED (hoặc FAILED/EXPIRED)
 */
public enum CommandStatus {
    PENDING,        // Tạo ra, chờ gửi (device có thể đang offline)
    SENT,           // Đã gửi xuống thiết bị qua WebSocket
    ACKNOWLEDGED,   // Thiết bị đã nhận lệnh (đã ACK)
    EXECUTED,       // Thiết bị đã thực thi thành công
    FAILED,         // Thiết bị thực thi thất bại
    EXPIRED         // Hết thời gian chờ (device không phản hồi)
}
