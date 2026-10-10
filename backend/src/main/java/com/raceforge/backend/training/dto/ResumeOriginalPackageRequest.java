package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;

public record ResumeOriginalPackageRequest(
        @NotBlank String reason
) {
}
