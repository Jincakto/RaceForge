package com.raceforge.backend.common.response;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        String code,
        String message,
        int status,
        String path,
        Instant timestamp,
        Map<String, String> validationErrors
) {

    public static ErrorResponse of(String code, String message, int status, String path) {
        return new ErrorResponse(code, message, status, path, Instant.now(), Map.of());
    }

    public static ErrorResponse validation(String message, int status, String path, Map<String, String> validationErrors) {
        return new ErrorResponse("VALIDATION_ERROR", message, status, path, Instant.now(), validationErrors);
    }
}
