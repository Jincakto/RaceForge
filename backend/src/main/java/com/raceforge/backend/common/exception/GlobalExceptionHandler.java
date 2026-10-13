package com.raceforge.backend.common.exception;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.common.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<ErrorResponse>> handleResourceNotFound(
            ResourceNotFoundException exception,
            HttpServletRequest request
    ) {
        return buildErrorResponse(
                HttpStatus.NOT_FOUND,
                "RESOURCE_NOT_FOUND",
                exception.getMessage(),
                request.getRequestURI()
        );
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiResponse<ErrorResponse>> handleBusinessRule(
            BusinessRuleException exception,
            HttpServletRequest request
    ) {
        return buildErrorResponse(
                HttpStatus.CONFLICT,
                "BUSINESS_RULE_VIOLATION",
                exception.getMessage(),
                request.getRequestURI()
        );
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<ErrorResponse>> handleApiException(
            ApiException exception,
            HttpServletRequest request
    ) {
        return buildErrorResponse(
                exception.getStatus(),
                exception.getCode(),
                exception.getMessage(),
                request.getRequestURI()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<ErrorResponse>> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        Map<String, String> validationErrors = new LinkedHashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            validationErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        HttpStatus status = HttpStatus.BAD_REQUEST;
        ErrorResponse error = ErrorResponse.validation(
                "Request validation failed",
                status.value(),
                request.getRequestURI(),
                validationErrors
        );

        return ResponseEntity.status(status)
                .body(ApiResponse.failure("Request validation failed", error));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<ErrorResponse>> handleConstraintViolation(
            ConstraintViolationException exception,
            HttpServletRequest request
    ) {
        Map<String, String> validationErrors = new LinkedHashMap<>();
        exception.getConstraintViolations().forEach(violation ->
                validationErrors.put(violation.getPropertyPath().toString(), violation.getMessage())
        );

        HttpStatus status = HttpStatus.BAD_REQUEST;
        ErrorResponse error = ErrorResponse.validation(
                "Request validation failed",
                status.value(),
                request.getRequestURI(),
                validationErrors
        );

        return ResponseEntity.status(status)
                .body(ApiResponse.failure("Request validation failed", error));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<ErrorResponse>> handleUnexpected(
            Exception exception,
            HttpServletRequest request
    ) {
        if (exception instanceof HttpMessageNotReadableException) {
            return buildErrorResponse(HttpStatus.BAD_REQUEST, "INVALID_REQUEST_BODY",
                    "Request body is missing or invalid. Check JSON syntax, field types and date formats.",
                    request.getRequestURI());
        }
        if (exception instanceof MethodArgumentTypeMismatchException mismatch) {
            String type = mismatch.getRequiredType() == null ? "the required type" : mismatch.getRequiredType().getSimpleName();
            return buildErrorResponse(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER_TYPE",
                    "Parameter '" + mismatch.getName() + "' must be " + type + ".", request.getRequestURI());
        }
        if (exception instanceof AccessDeniedException) {
            return buildErrorResponse(HttpStatus.FORBIDDEN, "ACCESS_DENIED",
                    "You do not have permission to perform this action.", request.getRequestURI());
        }
        // Preserve Spring's HTTP status and protocol headers (Allow, Accept, etc.).
        if (exception instanceof org.springframework.web.ErrorResponse frameworkError
                && frameworkError.getStatusCode().is4xxClientError()) {
            int status = frameworkError.getStatusCode().value();
            HttpStatus knownStatus = HttpStatus.resolve(status);
            String code = knownStatus == null ? "HTTP_" + status : knownStatus.name();
            String message = frameworkError.getBody().getDetail();
            if (message == null) {
                message = knownStatus == null ? "Request could not be processed." : knownStatus.getReasonPhrase();
            }
            return ResponseEntity.status(status).headers(frameworkError.getHeaders())
                    .body(ApiResponse.failure(message, ErrorResponse.of(code, message, status, request.getRequestURI())));
        }
        if (hasCause(exception, MailAuthenticationException.class)) {
            return reportError(exception, request, HttpStatus.SERVICE_UNAVAILABLE, "MAIL_AUTHENTICATION_FAILED",
                    "Email server authentication failed. Check the sender account and SMTP credentials.");
        }
        if (hasCause(exception, MailException.class)) {
            return reportError(exception, request, HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_DELIVERY_FAILED",
                    "Email could not be sent. Check SMTP connectivity and sender configuration.");
        }
        if (hasCause(exception, DataAccessResourceFailureException.class)
                || hasCause(exception, org.hibernate.exception.JDBCConnectionException.class)) {
            return reportError(exception, request, HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE",
                    "Cannot connect to the database. Please try again later.");
        }
        if (hasCause(exception, ConcurrencyFailureException.class)) {
            return reportError(exception, request, HttpStatus.CONFLICT, "CONCURRENT_UPDATE",
                    "The data is being modified by another request. Reload and try again.");
        }
        if (hasCause(exception, DataIntegrityViolationException.class)) {
            return reportError(exception, request, HttpStatus.CONFLICT, "DATA_CONSTRAINT_VIOLATION",
                    "The operation violates a database constraint. Check duplicate values, related records and required fields.");
        }
        if (hasCause(exception, org.hibernate.AssertionFailure.class)) {
            return reportError(exception, request, HttpStatus.INTERNAL_SERVER_ERROR, "PERSISTENCE_STATE_ERROR",
                    "The server could not persist an entity because its identifier or state is invalid. Provide errorId for investigation.");
        }
        if (hasCause(exception, DataAccessException.class)
                || hasCause(exception, jakarta.persistence.PersistenceException.class)) {
            return reportError(exception, request, HttpStatus.INTERNAL_SERVER_ERROR, "DATABASE_OPERATION_FAILED",
                    "A database operation failed. Provide errorId to check the server log for mapping, schema or query errors.");
        }
        return reportError(exception, request, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR",
                "An unexpected server error occurred. Provide errorId to locate the cause in the server log.");
    }

    private boolean hasCause(Throwable exception, Class<? extends Throwable> type) {
        var visited = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Throwable, Boolean>());
        for (Throwable cause = exception; cause != null && visited.add(cause); cause = cause.getCause()) {
            if (type.isInstance(cause)) {
                return true;
            }
        }
        return false;
    }

    private ResponseEntity<ApiResponse<ErrorResponse>> reportError(
            Exception exception, HttpServletRequest request, HttpStatus status, String code, String message) {
        String errorId = UUID.randomUUID().toString();
        log.error("API failure errorId={} code={} method={} path={}",
                errorId, code, request.getMethod(), request.getRequestURI(), exception);
        ErrorResponse error = new ErrorResponse(code, message, status.value(), request.getRequestURI(),
                Instant.now(), Map.of(), errorId);
        return ResponseEntity.status(status).body(ApiResponse.failure(message, error));
    }

    private ResponseEntity<ApiResponse<ErrorResponse>> buildErrorResponse(
            HttpStatus status,
            String code,
            String message,
            String path
    ) {
        ErrorResponse error = ErrorResponse.of(code, message, status.value(), path);
        return ResponseEntity.status(status).body(ApiResponse.failure(message, error));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<ErrorResponse>> handleIllegalArgument(
            IllegalArgumentException exception,
            HttpServletRequest request) {
        return buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                "INVALID_ARGUMENT",
                exception.getMessage(),
                request.getRequestURI()
        );
    }
}
