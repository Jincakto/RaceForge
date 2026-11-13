package com.raceforge.backend.medical.mapper;

import com.raceforge.backend.medical.dto.MedicalClinicalExamResponse;
import com.raceforge.backend.medical.entity.MedicalClinicalExam;
import org.springframework.stereotype.Component;
import com.raceforge.backend.storage.StorageService;

import java.util.List;

@Component
public class MedicalClinicalExamMapper {
    private final StorageService storage;
    public MedicalClinicalExamMapper(StorageService storage) { this.storage = storage; }
    public MedicalClinicalExamResponse toResponse(MedicalClinicalExam entity) {
        if (entity == null) return null;
        MedicalClinicalExamResponse response = new MedicalClinicalExamResponse();
        response.setClinicalExamId(entity.getClinicalExamId());
        response.setExaminationArea(entity.getExaminationArea());
        response.setConditionStatus(entity.getConditionStatus());
        response.setNotes(entity.getNotes());
        response.setEvidenceImageUrl(entity.getEvidenceImagePath() == null ? null
                : storage.readUrl(StorageService.IMAGES, entity.getEvidenceImagePath()));
        return response;
    }

    public List<MedicalClinicalExamResponse> toResponses(List<MedicalClinicalExam> entities) {
        if (entities == null) return List.of();
        return entities.stream().map(this::toResponse).toList();
    }
}
