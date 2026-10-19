package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;


public record RecoveryApprovalRequest(
<<<<<<< HEAD
        @NotBlank String recoveryPackageId,
=======
        @NotNull String recoveryPackageId,
>>>>>>> 76de6e5 (luu code)
        String reason
) {
}
