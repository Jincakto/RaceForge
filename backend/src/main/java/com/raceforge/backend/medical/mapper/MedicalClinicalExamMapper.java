package com.raceforge.backend.medical.mapper;

import com.raceforge.backend.medical.dto.MedicalClinicalExamResponse;
import com.raceforge.backend.medical.entity.MedicalClinicalExam;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MedicalClinicalExamMapper {
    public MedicalClinicalExamResponse toResponse(MedicalClinicalExam entity) {
        if (entity == null) return null;
        MedicalClinicalExamResponse response = new MedicalClinicalExamResponse();
        response.setClinicalExamId(entity.getClinicalExamId());
        response.setExaminationArea(entity.getExaminationArea());
        response.setConditionStatus(entity.getConditionStatus());
        response.setAbnormalityType(entity.getAbnormalityType());
        response.setSeverity(entity.getSeverity());
        response.setNotes(entity.getNotes());
        return response;
    }

    public List<MedicalClinicalExamResponse> toResponses(List<MedicalClinicalExam> entities) {
        if (entities == null) return List.of();
        return entities.stream().map(this::toResponse).toList();
    }
}
