package com.raceforge.backend.training.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TrainingPackageResponse(
        String packageId,
        String packageName,
        String packageType,
        String description,
        Integer durationDays,
        BigDecimal price,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
