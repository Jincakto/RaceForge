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
        // LocalDateTime paidAt, // Removed from the API in V5.
        LocalDate startDate,
        LocalDate endDate,
        Integer remainingDays,
        Integer packageVersion, String packageFamilyId, java.time.Instant pendingExpiresAtUtc
) {
    public HorsePackageResponse(String id,String horse,String pack,String name,String type,String status,String payment,BigDecimal price,LocalDateTime registered,LocalDate start,LocalDate end,Integer remaining){this(id,horse,pack,name,type,status,payment,price,registered,start,end,remaining,1,pack,null);}
}
