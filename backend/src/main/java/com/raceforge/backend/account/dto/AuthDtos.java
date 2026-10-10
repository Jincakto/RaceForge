package com.raceforge.backend.account.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 150) String fullName,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @Size(max = 20) String phone,
            @NotBlank String requestedRoleId
    ) {
    }

    public record VerifyEmailRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "\\d{6}") String otp
    ) {
    }

    public record ResendOtpRequest(@NotBlank @Email String email) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {
    }

    public record GoogleAuthRequest(
            @NotBlank String idToken,
            String requestedRoleId
    ) {
    }

    public record RefreshRequest(String refreshToken) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 100) String newPassword
    ) {
    }

    public record AuthResponse(
            String accessToken,
            String tokenType,
            long expiresInSeconds,
            UserResponse user
    ) {
    }

    public record MessageResponse(String message) {
    }

    public record UserResponse(
            String userId,
            String fullName,
            String email,
            String phone,
            String status,
            boolean emailVerified,
            String avatarUrl,
            RoleResponse role
    ) {
    }

    public record RoleResponse(String roleId, String roleName) {
    }

    public record RegistrationRequestResponse(
            String requestId,
            UserResponse user,
            RoleResponse requestedRole,
            String status,
            String reviewedBy,
            Instant reviewedAt,
            String reviewNote,
            Instant createdAt
    ) {
    }

    public record PageResponse<T>(
            List<T> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }
}
