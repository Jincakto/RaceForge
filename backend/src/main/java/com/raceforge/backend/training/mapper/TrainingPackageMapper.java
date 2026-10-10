package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.entity.TrainingPackage;
import org.springframework.stereotype.Component;

@Component
public class TrainingPackageMapper {

    public String toId(TrainingPackage entity) {
        if (entity == null) {
            return null;
        }

        return entity.getPackageId();
    }
}
