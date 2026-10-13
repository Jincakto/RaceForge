package com.raceforge.backend.medical.mapper;

import com.raceforge.backend.medical.dto.MedicalVitalSignResponse;
import com.raceforge.backend.medical.entity.MedicalVitalSign;
import org.springframework.stereotype.Component;

@Component
public class MedicalVitalSignMapper {
    public MedicalVitalSignResponse toResponse(MedicalVitalSign entity) {
        if (entity == null) return null;
        MedicalVitalSignResponse response = new MedicalVitalSignResponse();
        response.setVitalSignId(entity.getVitalSignId());
        response.setBodyTemperature(entity.getBodyTemperature());
        response.setRestingHeartRate(entity.getRestingHeartRate());
        response.setRestingRespiratoryRate(entity.getRestingRespiratoryRate());
        return response;
    }
}
