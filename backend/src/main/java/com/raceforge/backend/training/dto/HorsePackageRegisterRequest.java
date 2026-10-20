package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;


public record HorsePackageRegisterRequest(
<<<<<<< HEAD
        @NotBlank String horseId,
        @NotBlank String packageId
=======
        @NotNull String horseId,
        @NotNull String packageId
>>>>>>> 76de6e5 (luu code)
        ) {
}
