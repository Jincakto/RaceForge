package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;

public record RecoveryApprovalRequest(
        @NotBlank String recoveryPackageId,
        String reason
) {
}
