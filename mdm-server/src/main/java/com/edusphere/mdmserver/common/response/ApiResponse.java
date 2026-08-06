package com.edusphere.mdmserver.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

/**
 * Chuẩn hóa response format cho toàn bộ API.
 *
 * Tại sao cần chuẩn hóa?
 * - Frontend biết chính xác format để parse
 * - Dễ handle error một cách thống nhất
 * - Dễ log và debug
 *
 * @param <T> Kiểu dữ liệu của field 'data'
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String message;
    private final T data;
    private final String errorCode;
    private final Instant timestamp;

    // ============================================================
    // Factory Methods - Success
    // ============================================================

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    public static ApiResponse<Void> success(String message) {
        return ApiResponse.<Void>builder()
                .success(true)
                .message(message)
                .timestamp(Instant.now())
                .build();
    }

    // ============================================================
    // Factory Methods - Error
    // ============================================================

    public static ApiResponse<Void> error(String errorCode, String message) {
        return ApiResponse.<Void>builder()
                .success(false)
                .errorCode(errorCode)
                .message(message)
                .timestamp(Instant.now())
                .build();
    }
}
