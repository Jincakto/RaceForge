package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RecoveryApprovalRequest(
        @NotNull @jakarta.validation.constraints.Pattern(regexp = "PKG-[0-9]{3}") String recoveryPackageId,
        String reason
) {
}
