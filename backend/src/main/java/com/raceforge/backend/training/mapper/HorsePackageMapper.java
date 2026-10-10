package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.entity.HorsePackage;
import org.springframework.stereotype.Component;

@Component
public class HorsePackageMapper {

    public String toId(HorsePackage entity) {
        if (entity == null) {
            return null;
        }

        return entity.getHorsePackageId();
    }
}
