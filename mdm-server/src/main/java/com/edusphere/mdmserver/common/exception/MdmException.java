package com.edusphere.mdmserver.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Business Exception chuẩn cho toàn bộ hệ thống.
 *
 * Tại sao không dùng RuntimeException trực tiếp?
 * - Có thêm errorCode để Frontend handle chính xác
 * - Có HttpStatus để GlobalExceptionHandler trả về đúng HTTP status
 * - Dễ trace và log
 */
@Getter
public class MdmException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus httpStatus;

    public MdmException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode.getCode();
        this.httpStatus = errorCode.getHttpStatus();
    }

    public MdmException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode.getCode();
        this.httpStatus = errorCode.getHttpStatus();
    }
}
