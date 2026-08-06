package com.edusphere.mdmserver.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * Tất cả Error Code của hệ thống.
 *
 * Tại sao dùng Enum?
 * - Tập trung quản lý tất cả error codes
 * - Tránh hardcode string rải rác trong code
 * - Dễ document và maintain
 * - Frontend có thể map chính xác error code để hiển thị đúng UI
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // ============================================================
    // AUTHENTICATION - 1xxx
    // ============================================================
    INVALID_CREDENTIALS("AUTH_001", "Tên đăng nhập hoặc mật khẩu không đúng", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED("AUTH_002", "Token đã hết hạn", HttpStatus.UNAUTHORIZED),
    TOKEN_INVALID("AUTH_003", "Token không hợp lệ", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_EXPIRED("AUTH_004", "Refresh token đã hết hạn, vui lòng đăng nhập lại", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_REVOKED("AUTH_005", "Refresh token đã bị thu hồi", HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED("AUTH_006", "Bạn không có quyền thực hiện hành động này", HttpStatus.FORBIDDEN),
    USER_DISABLED("AUTH_007", "Tài khoản đã bị vô hiệu hóa", HttpStatus.FORBIDDEN),

    // ============================================================
    // DEVICE - 2xxx
    // ============================================================
    DEVICE_NOT_FOUND("DEV_001", "Thiết bị không tồn tại", HttpStatus.NOT_FOUND),
    DEVICE_ALREADY_REGISTERED("DEV_002", "Thiết bị đã được đăng ký", HttpStatus.CONFLICT),
    DEVICE_NOT_AUTHENTICATED("DEV_003", "Thiết bị chưa được xác thực", HttpStatus.UNAUTHORIZED),
    DEVICE_ALREADY_ASSIGNED("DEV_004", "Thiết bị đã được gán vào trường/lớp", HttpStatus.CONFLICT),
    DEVICE_OFFLINE("DEV_005", "Thiết bị đang offline", HttpStatus.SERVICE_UNAVAILABLE),

    // ============================================================
    // SCHOOL / CAMPUS / CLASSROOM - 3xxx
    // ============================================================
    SCHOOL_NOT_FOUND("SCH_001", "Trường học không tồn tại", HttpStatus.NOT_FOUND),
    SCHOOL_CODE_EXISTS("SCH_002", "Mã trường đã tồn tại", HttpStatus.CONFLICT),
    CAMPUS_NOT_FOUND("SCH_003", "Cơ sở không tồn tại", HttpStatus.NOT_FOUND),
    CAMPUS_CODE_EXISTS("SCH_004", "Mã cơ sở đã tồn tại", HttpStatus.CONFLICT),
    CLASSROOM_NOT_FOUND("SCH_005", "Lớp học không tồn tại", HttpStatus.NOT_FOUND),
    CLASSROOM_CODE_EXISTS("SCH_006", "Mã lớp học đã tồn tại", HttpStatus.CONFLICT),

    // ============================================================
    // ALERT - 4xxx
    // ============================================================
    ALERT_NOT_FOUND("ALT_001", "Cảnh báo không tồn tại", HttpStatus.NOT_FOUND),
    ALERT_ALREADY_RESOLVED("ALT_002", "Cảnh báo đã được xử lý", HttpStatus.CONFLICT),

    // ============================================================
    // COMMAND - 5xxx
    // ============================================================
    COMMAND_NOT_FOUND("CMD_001", "Lệnh không tồn tại", HttpStatus.NOT_FOUND),
    COMMAND_FAILED("CMD_002", "Gửi lệnh thất bại", HttpStatus.INTERNAL_SERVER_ERROR),

    // ============================================================
    // RULE - 6xxx
    // ============================================================
    RULE_NOT_FOUND("RUL_001", "Rule không tồn tại", HttpStatus.NOT_FOUND),

    // ============================================================
    // USER - 7xxx
    // ============================================================
    USER_NOT_FOUND("USR_001", "Người dùng không tồn tại", HttpStatus.NOT_FOUND),
    USERNAME_EXISTS("USR_002", "Tên đăng nhập đã tồn tại", HttpStatus.CONFLICT),
    EMAIL_EXISTS("USR_003", "Email đã tồn tại", HttpStatus.CONFLICT),

    // ============================================================
    // VALIDATION - 8xxx
    // ============================================================
    VALIDATION_FAILED("VAL_001", "Dữ liệu đầu vào không hợp lệ", HttpStatus.BAD_REQUEST),

    // ============================================================
    // SYSTEM - 9xxx
    // ============================================================
    INTERNAL_SERVER_ERROR("SYS_001", "Lỗi hệ thống, vui lòng thử lại sau", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
