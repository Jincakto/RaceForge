package com.raceforge.backend.medical.mapper;

import com.raceforge.backend.medical.dto.MedicalRecordResponse;
import com.raceforge.backend.medical.entity.MedicalClinicalExam;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.entity.MedicalVitalSign;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MedicalRecordMapper {
    private final MedicalVitalSignMapper vitalSignMapper;
    private final MedicalClinicalExamMapper clinicalExamMapper;

    public MedicalRecordMapper(MedicalVitalSignMapper vitalSignMapper,
                               MedicalClinicalExamMapper clinicalExamMapper) {
        this.vitalSignMapper = vitalSignMapper;
        this.clinicalExamMapper = clinicalExamMapper;
    }

    public MedicalRecordResponse toResponse(MedicalRecord record,
                                            MedicalVitalSign vitalSign,
                                            List<MedicalClinicalExam> clinicalExams) {
        if (record == null) return null;
        MedicalRecordResponse response = new MedicalRecordResponse();
        response.setMedicalRecordId(record.getMedicalRecordId());
        response.setProfileId(record.getHealthProfile() == null ? null : record.getHealthProfile().getProfileId());
        response.setVeterinarianId(record.getVeterinarian() == null ? null : record.getVeterinarian().getUserId());
        response.setCorrectionOfId(record.getCorrectionOf() == null ? null : record.getCorrectionOf().getMedicalRecordId());
        response.setExamType(record.getExamType());
        response.setExaminedAt(record.getExaminedAt());
        response.setHealthStatus(record.getHealthStatus());
        response.setDiagnosis(record.getDiagnosis());
        response.setTreatment(record.getTreatment());
        response.setMedication(record.getMedication());
        response.setCareRecommendation(record.getCareRecommendation());
        response.setNotes(record.getNotes());
        response.setSystemNote(record.getSystemNote());
        response.setTrainingNote(record.getTrainingNote());
        response.setStatus(record.getStatus());
        response.setConfirmedAt(record.getConfirmedAt());
        response.setCreatedAt(record.getCreatedAt());
        response.setUpdatedAt(record.getUpdatedAt());
        response.setVitalSign(vitalSignMapper.toResponse(vitalSign));
        response.setClinicalExams(clinicalExamMapper.toResponses(clinicalExams));
        return response;
    }
}
