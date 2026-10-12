package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.dto.TrainingPackageCreateRequest;
import com.raceforge.backend.training.dto.TrainingPackageResponse;
import com.raceforge.backend.training.dto.TrainingPackageUpdateRequest;
import com.raceforge.backend.training.entity.TrainingPackage;
import org.springframework.stereotype.Component;

@Component
public class TrainingPackageMapper {

    public TrainingPackage toEntity(TrainingPackageCreateRequest request) {
        TrainingPackage entity = new TrainingPackage();
        entity.setPackageName(request.packageName().trim());
        entity.setPackageType(request.packageType().trim().toUpperCase(java.util.Locale.ROOT));
        entity.setDescription(request.description());
        entity.setDurationDays(request.durationDays());
        entity.setPrice(request.price());
        entity.setStatus("ACTIVE");
        return entity;
    }

    public void updateEntity(TrainingPackage entity, TrainingPackageUpdateRequest request) {
        entity.setPackageName(request.packageName().trim());
        entity.setPackageType(request.packageType().trim().toUpperCase(java.util.Locale.ROOT));
        entity.setDescription(request.description());
        entity.setDurationDays(request.durationDays());
        entity.setPrice(request.price());
    }

    public TrainingPackageResponse toResponse(TrainingPackage entity) {
        return new TrainingPackageResponse(
                entity.getPackageId(), entity.getPackageName(), entity.getPackageType(),
                entity.getDescription(), entity.getDurationDays(), entity.getPrice(),
                entity.getStatus(), entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }
}
