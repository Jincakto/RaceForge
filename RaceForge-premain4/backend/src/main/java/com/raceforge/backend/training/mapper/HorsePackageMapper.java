package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Component
public class HorsePackageMapper {

    public HorsePackageResponse toResponse(HorsePackage entity) {
        return new HorsePackageResponse(
                entity.getHorsePackageId(),
                entity.getHorse().getHorseId(),
                entity.getTrainingPackage().getPackageId(),
                entity.getTrainingPackage().getPackageName(),
                entity.getTrainingPackage().getPackageType(),
                entity.getStatus(),
                entity.getPaymentStatus(),
                entity.getTotalPrice(),
                entity.getRegisteredAt(),
                // entity.getPaidAt(), // Removed with paid_at in V5.
                entity.getStartDate(),
                entity.getEndDate(),
                displayedRemainingDays(entity),
                entity.getReplacedHorsePackage() == null
                        ? null
                        : entity.getReplacedHorsePackage().getHorsePackageId());
    }

    /** ACTIVE counts down live; PAUSED shows frozen days; COMPLETED is zero. */
    private Integer displayedRemainingDays(HorsePackage entity) {
        if ("COMPLETED".equalsIgnoreCase(entity.getStatus())) {
            return 0;
        }
        if ("ACTIVE".equalsIgnoreCase(entity.getStatus()) && entity.getEndDate() != null) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), entity.getEndDate()) + 1L;
            return Math.toIntExact(Math.max(0L, days));
        }
        return entity.getRemainingDays();
    }
}
