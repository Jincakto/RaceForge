package com.raceforge.backend.account.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class UserDtos {
    public record CreateStaffRequest(
            @NotBlank @Size(max = 150) String fullName,
            @NotBlank @jakarta.validation.constraints.Email @Size(max = 255) String email,
            @Size(max = 20) String phone,
            @jakarta.validation.constraints.NotNull String roleId
    ) {
    }

    private UserDtos() {
    }

    public record UpdateMeRequest(
            @NotBlank @Size(max = 150) String fullName,
            @Size(max = 20) String phone,
            @Size(max = 500) String avatarUrl
    ) {
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100) String newPassword
    ) {
    }

    public record UpdateStatusRequest(@NotBlank String status) {
    }
}
