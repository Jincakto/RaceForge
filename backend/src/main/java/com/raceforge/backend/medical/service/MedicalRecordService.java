package com.raceforge.backend.medical.service;

import com.raceforge.backend.medical.dto.*;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.repository.*;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.Locale;

@Service
public class MedicalRecordService {

    private final HealthProfileRepository healthProfileRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalVitalSignRepository medicalVitalSignRepository;
    private final MedicalClinicalExamRepository medicalClinicalExamRepository;
    private final UserRepository userRepository;
    private final MedicalEvaluationService medicalEvaluationService;
    
    public MedicalRecordService(
            HealthProfileRepository healthProfileRepository,
            MedicalRecordRepository medicalRecordRepository,
            MedicalVitalSignRepository medicalVitalSignRepository,
            MedicalClinicalExamRepository medicalClinicalExamRepository,
            UserRepository userRepository,
            MedicalEvaluationService medicalEvaluationService) {
    
        this.healthProfileRepository = healthProfileRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicalVitalSignRepository = medicalVitalSignRepository;
        this.medicalClinicalExamRepository = medicalClinicalExamRepository;
        this.userRepository = userRepository;
        this.medicalEvaluationService = medicalEvaluationService;
    }

    @Transactional
public MedicalRecordResponse createMedicalRecord(
            MedicalRecordCreateRequest request) {

        HealthProfile healthProfile = healthProfileRepository
                .findById(request.getProfileId())
                .orElseThrow(() ->
                        new RuntimeException("Health profile not found"));

        MedicalRecord medicalRecord = new MedicalRecord();
    
        medicalRecord.setMedicalRecordId(generateId("MED"));
        medicalRecord.setHealthProfile(healthProfile);
        User veterinarian = getVeterinarian(
            request.getVeterinarianId()
        );
        medicalRecord.setVeterinarian(veterinarian);
        medicalRecord.setExamType(request.getExamType());
        medicalRecord.setExaminedAt(request.getExaminedAt());
    
        medicalRecord.setHealthStatus(request.getHealthStatus());
    
        medicalRecord.setDiagnosis(request.getDiagnosis());
        medicalRecord.setTreatment(request.getTreatment());
        medicalRecord.setMedication(request.getMedication());
        medicalRecord.setCareRecommendation(
                request.getCareRecommendation());
        medicalRecord.setNotes(request.getNotes());
    
        medicalRecord.setStatus("DRAFT");

        if (request.getCorrectionOfId() != null
                && !request.getCorrectionOfId().isBlank()) {
    
            MedicalRecord oldRecord = medicalRecordRepository
                    .findById(request.getCorrectionOfId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Original medical record not found"));
    
            medicalRecord.setCorrectionOf(oldRecord);
        }

        MedicalEvaluationResult evaluation =
            medicalEvaluationService.evaluate(
                    request.getExamType(),
                    request.getVitalSign(),
                    request.getClinicalExams()
        );

        medicalRecord.setSystemNote(
                evaluation.systemNote()
        );
        
        medicalRecord.setTrainingNote(
                evaluation.trainingNote()
        );
    
        medicalRecordRepository.save(medicalRecord);
    
        saveVitalSign(
                medicalRecord,
                request.getVitalSign()
        );
    
        saveClinicalExams(
                medicalRecord,
                request.getClinicalExams()
        );
    
        return buildResponse(medicalRecord);
    }
    
    private void saveVitalSign(
            MedicalRecord medicalRecord,
            MedicalVitalSignRequest request) {
    
        if (request == null) {
            return;
        }
    
        MedicalVitalSign vitalSign = new MedicalVitalSign();
    
        vitalSign.setVitalSignId(generateId("VIT"));
        vitalSign.setMedicalRecord(medicalRecord);
    
        vitalSign.setBodyTemperature(
                request.getBodyTemperature());
    
        vitalSign.setRestingHeartRate(
                request.getRestingHeartRate());
    
        vitalSign.setRestingRespiratoryRate(
                request.getRestingRespiratoryRate());
    
        medicalVitalSignRepository.save(vitalSign);
    }

    private void saveClinicalExams(
            MedicalRecord medicalRecord,
            List<MedicalClinicalExamRequest> requests) {
    
        if (requests == null || requests.isEmpty()) {
            return;
        }
    
        for (MedicalClinicalExamRequest request : requests) {
    
            MedicalClinicalExam exam =
                    new MedicalClinicalExam();
    
            exam.setClinicalExamId(generateId("CLN"));
    
            exam.setMedicalRecord(medicalRecord);
    
            exam.setExaminationArea(
                    request.getExaminationArea().trim().toUpperCase()
            );
    
            exam.setConditionStatus(
                    request.getConditionStatus().trim().toUpperCase()
            );
    
            exam.setSeverity(
                    request.getSeverity() == null
                            || request.getSeverity().isBlank()
                            ? null
                            : request.getSeverity().trim().toUpperCase()
            );
    
            exam.setSeverity(
                    request.getSeverity());
    
            exam.setNotes(
                    request.getNotes());
    
            medicalClinicalExamRepository.save(exam);
        }
    }
    
    private String generateId(String prefix) {
        return prefix + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 10)
                .toUpperCase();
    }
    
    private MedicalRecordResponse buildResponse(MedicalRecord record) {

        MedicalRecordResponse response = new MedicalRecordResponse();

        response.setMedicalRecordId(record.getMedicalRecordId());
    
        response.setProfileId(
                record.getHealthProfile().getProfileId()
        );
    
        response.setVeterinarianId(
                record.getVeterinarian().getUserId()
        );
    
        if (record.getCorrectionOf() != null) {
            response.setCorrectionOfId(
                    record.getCorrectionOf().getMedicalRecordId()
            );
        }
    
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

        medicalVitalSignRepository
                .findByMedicalRecord_MedicalRecordId(
                        record.getMedicalRecordId()
                )
                .ifPresent(vitalSign -> {
    
                    MedicalVitalSignResponse vitalResponse =
                            new MedicalVitalSignResponse();
    
                    vitalResponse.setVitalSignId(
                            vitalSign.getVitalSignId()
                    );
    
                    vitalResponse.setBodyTemperature(
                            vitalSign.getBodyTemperature()
                    );
    
                    vitalResponse.setRestingHeartRate(
                            vitalSign.getRestingHeartRate()
                    );
    
                    vitalResponse.setRestingRespiratoryRate(
                            vitalSign.getRestingRespiratoryRate()
                    );
    
                    response.setVitalSign(vitalResponse);
                });

        List<MedicalClinicalExam> clinicalExams =
                medicalClinicalExamRepository
                        .findByMedicalRecord_MedicalRecordId(
                                record.getMedicalRecordId()
                        );
    
        List<MedicalClinicalExamResponse> clinicalResponses =
                clinicalExams.stream().map(exam -> {
    
                    MedicalClinicalExamResponse examResponse =
                            new MedicalClinicalExamResponse();
    
                    examResponse.setClinicalExamId(
                            exam.getClinicalExamId()
                    );
    
                    examResponse.setExaminationArea(
                            exam.getExaminationArea()
                    );
    
                    examResponse.setConditionStatus(
                            exam.getConditionStatus()
                    );
    
                    examResponse.setAbnormalityType(
                            exam.getAbnormalityType()
                    );
    
                    examResponse.setSeverity(
                            exam.getSeverity()
                    );
    
                    examResponse.setNotes(
                            exam.getNotes()
                    );
    
                    return examResponse;
    
                }).toList();
    
        response.setClinicalExams(clinicalResponses);
    
        return response;
    }
    
    private User getVeterinarian(String veterinarianId) {

        User user = userRepository.findDetailedById(veterinarianId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Veterinarian not found"));
    
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new IllegalStateException(
                    "Veterinarian account is not active");
        }
    
        if (user.getRole() == null
                || !"VETERINARIAN".equals(
                        user.getRole().getRoleName())) {
    
            throw new IllegalStateException(
                    "User does not have Veterinarian role");
        }
    
        return user;
    }

    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordById(
        String medicalRecordId) {
    
        MedicalRecord record = medicalRecordRepository
                .findById(medicalRecordId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Medical record not found"
                        )
                );
    
        return buildResponse(record);
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getMedicalHistory(
            String horseId) {
    
        HealthProfile profile = healthProfileRepository
                .findByHorse_HorseId(horseId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Health profile not found"
                        )
                );
    
        List<MedicalRecord> records = medicalRecordRepository
                .findByHealthProfile_ProfileIdOrderByExaminedAtDesc(
                        profile.getProfileId()
                );
    
        return records.stream()
                .map(this::buildResponse)
                .toList();
    }
}
