package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import org.springframework.stereotype.Component;

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
                entity.getPaidAt(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getRemainingDays(),
                entity.getReplacedHorsePackage() == null
                        ? null : entity.getReplacedHorsePackage().getHorsePackageId()
        );
    }
}
