package com.edusphere.mdmserver.common.exception;

import com.edusphere.mdmserver.common.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Global Exception Handler
 *
 * Tập trung xử lý TẤT CẢ exception tại một nơi.
 * Controller không cần try-catch - chỉ throw exception.
 * Handler này sẽ convert sang HTTP response chuẩn.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Xử lý Business Exception của hệ thống
     */
    @ExceptionHandler(MdmException.class)
    public ResponseEntity<ApiResponse<Void>> handleMdmException(MdmException ex) {
        log.warn("Business exception: [{}] {}", ex.getErrorCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getHttpStatus())
                .body(ApiResponse.error(ex.getErrorCode(), ex.getMessage()));
    }

    /**
     * Xử lý Validation Exception (@Valid, @Validated)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(fieldName, message);
        });
        log.warn("Validation failed: {}", errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Map<String, String>>builder()
                        .success(false)
                        .errorCode(ErrorCode.VALIDATION_FAILED.getCode())
                        .message(ErrorCode.VALIDATION_FAILED.getMessage())
                        .data(errors)
                        .build());
    }

    /**
     * Xử lý Spring Security Access Denied
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(
                        ErrorCode.ACCESS_DENIED.getCode(),
                        ErrorCode.ACCESS_DENIED.getMessage()
                ));
    }

    /**
     * Xử lý Bad Credentials (sai mật khẩu)
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(BadCredentialsException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(
                        ErrorCode.INVALID_CREDENTIALS.getCode(),
                        ErrorCode.INVALID_CREDENTIALS.getMessage()
                ));
    }

    /**
     * Xử lý tất cả Exception không được catch
     * Không expose stack trace ra ngoài
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unexpected error: ", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(
                        ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
                        ErrorCode.INTERNAL_SERVER_ERROR.getMessage()
                ));
    }
}
