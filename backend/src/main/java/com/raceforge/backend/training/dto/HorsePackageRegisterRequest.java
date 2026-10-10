package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;

public record HorsePackageRegisterRequest(
        @NotBlank String horseId,
        @NotBlank String packageId
) {
}
