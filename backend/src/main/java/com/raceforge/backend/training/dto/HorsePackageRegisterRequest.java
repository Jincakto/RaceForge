package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record HorsePackageRegisterRequest(
        @NotNull String horseId,
        @NotNull String packageId
        ) {
}
