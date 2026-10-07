package com.bloodlink.exception;

import com.bloodlink.common.ErrorCodes;
import com.bloodlink.common.api.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getCode(), ex.getMessage(), request);
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiError> handleBusinessRule(BusinessRuleException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "BUSINESS_RULE", ex.getCode(), ex.getMessage(), request);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(ConflictException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, "CONFLICT", ex.getCode(), ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCredentials(InvalidCredentialsException ex, HttpServletRequest request) {
        return error(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", ex.getCode(), ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> details = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            details.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                ErrorCodes.VALIDATION_ERROR,
                "Invalid request",
                request,
                details
        );
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraint(ConstraintViolationException ex, HttpServletRequest request) {
        Map<String, String> details = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(violation ->
                details.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage()));
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                ErrorCodes.VALIDATION_ERROR,
                "Invalid request",
                request,
                details
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return error(
                HttpStatus.FORBIDDEN,
                "ACCESS_DENIED",
                ErrorCodes.UNAUTHORIZED_ACTION,
                "You are not allowed to perform this action",
                request
        );
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return error(
                HttpStatus.UNAUTHORIZED,
                "UNAUTHORIZED",
                ErrorCodes.AUTHENTICATION_REQUIRED,
                "Authentication is required",
                request
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled server error on {}", request.getRequestURI(), ex);
        return error(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                ErrorCodes.INTERNAL_ERROR,
                "An unexpected error occurred",
                request
        );
    }

    private ResponseEntity<ApiError> error(
            HttpStatus status,
            String error,
            String code,
            String message,
            HttpServletRequest request
    ) {
        return error(status, error, code, message, request, Map.of());
    }

    private ResponseEntity<ApiError> error(
            HttpStatus status,
            String error,
            String code,
            String message,
            HttpServletRequest request,
            Map<String, String> details
    ) {
        return ResponseEntity.status(status).body(
                ApiError.of(status.value(), error, code, message, request.getRequestURI(), details)
        );
    }
}
