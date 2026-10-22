package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record TrainingPackageUpdateRequest(
        @NotBlank @Size(max = 100) String packageName,
        @NotBlank String packageType,
        @Size(max = 500) String description,
        @NotNull @Min(1) Integer durationDays,
        @NotNull @DecimalMin("0.0") @Digits(integer = 10, fraction = 2) BigDecimal price
) {}
