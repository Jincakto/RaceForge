package com.raceforge.backend.training.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record HorsePackageResponse(
        Integer horsePackageId,
        @jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId,
        @jakarta.validation.constraints.Pattern(regexp = "PKG-[0-9]{3}") String packageId,
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
        Integer replacedHorsePackageId
) {
}
