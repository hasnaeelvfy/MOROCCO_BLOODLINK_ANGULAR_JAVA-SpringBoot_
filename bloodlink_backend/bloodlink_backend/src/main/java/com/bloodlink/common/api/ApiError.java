package com.bloodlink.common.api;

import java.time.Instant;
import java.util.Map;

public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        Map<String, String> details
) {
    public static ApiError of(int status, String error, String message, String path) {
        return of(status, error, error, message, path, Map.of());
    }

    public static ApiError of(int status, String error, String message, String path, Map<String, String> details) {
        return of(status, error, error, message, path, details);
    }

    public static ApiError of(
            int status,
            String error,
            String code,
            String message,
            String path,
            Map<String, String> details
    ) {
        return new ApiError(
                Instant.now(),
                status,
                error,
                code == null || code.isBlank() ? error : code,
                message,
                path,
                details == null ? Map.of() : details
        );
    }
}
