package com.raceforge.backend.account.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class UserDtos {

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
