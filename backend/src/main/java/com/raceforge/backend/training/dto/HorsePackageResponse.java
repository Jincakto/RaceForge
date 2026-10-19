package com.raceforge.backend.training.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record HorsePackageResponse(
        String horsePackageId,
        String horseId,
        String packageId,
        String packageName,
        String packageType,
        String status,
        String paymentStatus,
        BigDecimal totalPrice,
        LocalDateTime registeredAt,
        LocalDateTime paidAt,
        LocalDate startDate,
        LocalDate endDate,
        Integer remainingDays,
        String replacedHorsePackageId
) {
}
