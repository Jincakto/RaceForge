package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotNull;

public record HorsePackagePaymentRequest(
        @NotNull Boolean successful
) {
}
