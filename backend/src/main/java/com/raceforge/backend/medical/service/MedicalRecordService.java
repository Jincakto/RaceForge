package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.medical.dto.*;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.mapper.MedicalRecordMapper;
import com.raceforge.backend.medical.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class MedicalRecordService {
    private final HealthProfileRepository healthProfileRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalVitalSignRepository medicalVitalSignRepository;
    private final MedicalClinicalExamRepository medicalClinicalExamRepository;
    private final UserRepository userRepository;
    private final MedicalEvaluationService medicalEvaluationService;
    private final MedicalRecordMapper medicalRecordMapper;

    public MedicalRecordService(
            HealthProfileRepository healthProfileRepository,
            MedicalRecordRepository medicalRecordRepository,
            MedicalVitalSignRepository medicalVitalSignRepository,
            MedicalClinicalExamRepository medicalClinicalExamRepository,
            UserRepository userRepository,
            MedicalEvaluationService medicalEvaluationService,
            MedicalRecordMapper medicalRecordMapper) {
        this.healthProfileRepository = healthProfileRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicalVitalSignRepository = medicalVitalSignRepository;
        this.medicalClinicalExamRepository = medicalClinicalExamRepository;
        this.userRepository = userRepository;
        this.medicalEvaluationService = medicalEvaluationService;
        this.medicalRecordMapper = medicalRecordMapper;
    }

    @Transactional
    public MedicalRecordResponse createMedicalRecord(MedicalRecordCreateRequest request) {
        HealthProfile profile = healthProfileRepository.findById(request.getProfileId())
                .orElseThrow(() -> new IllegalArgumentException("Health profile not found"));
        MedicalRecord record = new MedicalRecord();
        record.setMedicalRecordId(generateId("MED"));
        record.setHealthProfile(profile);
        record.setVeterinarian(getVeterinarian(request.getVeterinarianId()));
        record.setExamType(normalize(request.getExamType()));
        record.setExaminedAt(request.getExaminedAt());
        record.setHealthStatus(request.getHealthStatus());
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatment(request.getTreatment());
        record.setMedication(request.getMedication());
        record.setCareRecommendation(request.getCareRecommendation());
        record.setNotes(request.getNotes());
        record.setStatus("DRAFT");

        if (request.getCorrectionOfId() != null && !request.getCorrectionOfId().isBlank()) {
            MedicalRecord original = medicalRecordRepository.findById(request.getCorrectionOfId())
                    .orElseThrow(() -> new IllegalArgumentException("Original medical record not found"));
            if (!original.getHealthProfile().getProfileId().equals(profile.getProfileId())) {
                throw new IllegalArgumentException("Correction must belong to the same health profile");
            }
            record.setCorrectionOf(original);
        }

        MedicalEvaluationResult evaluation = medicalEvaluationService.evaluate(
                request.getExamType(), request.getVitalSign(), request.getClinicalExams());
        record.setSystemNote(evaluation.systemNote());
        record.setTrainingNote(evaluation.trainingNote());
        medicalRecordRepository.save(record);
        saveVitalSign(record, request.getVitalSign());
        saveClinicalExams(record, request.getClinicalExams());
        return buildResponse(record);
    }

    private void saveVitalSign(MedicalRecord record, MedicalVitalSignRequest request) {
        if (request == null) return;
        MedicalVitalSign entity = new MedicalVitalSign();
        entity.setVitalSignId(generateId("VIT"));
        entity.setMedicalRecord(record);
        entity.setBodyTemperature(request.getBodyTemperature());
        entity.setRestingHeartRate(request.getRestingHeartRate());
        entity.setRestingRespiratoryRate(request.getRestingRespiratoryRate());
        medicalVitalSignRepository.save(entity);
    }

    private void saveClinicalExams(MedicalRecord record, List<MedicalClinicalExamRequest> requests) {
        if (requests == null) return;
        for (MedicalClinicalExamRequest request : requests) {
            // Incomplete draft rows are not persisted; evaluation still records INCOMPLETE.
            if (request == null || isBlank(request.getExaminationArea())
                    || isBlank(request.getConditionStatus())) continue;
            MedicalClinicalExam entity = new MedicalClinicalExam();
            entity.setClinicalExamId(generateId("CLN"));
            entity.setMedicalRecord(record);
            entity.setExaminationArea(normalize(request.getExaminationArea()));
            entity.setConditionStatus(normalize(request.getConditionStatus()));
            entity.setAbnormalityType(request.getAbnormalityType());
            entity.setSeverity(isBlank(request.getSeverity()) ? null : normalize(request.getSeverity()));
            entity.setNotes(request.getNotes());
            medicalClinicalExamRepository.save(entity);
        }
    }

    private MedicalRecordResponse buildResponse(MedicalRecord record) {
        MedicalVitalSign vitalSign = medicalVitalSignRepository
                .findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId())
                .orElse(null);
        List<MedicalClinicalExam> exams = medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId());
        return medicalRecordMapper.toResponse(record, vitalSign, exams);
    }

    private User getVeterinarian(String veterinarianId) {
        User user = userRepository.findDetailedById(veterinarianId)
                .orElseThrow(() -> new IllegalArgumentException("Veterinarian not found"));
        if (!"ACTIVE".equals(user.getStatus()))
            throw new IllegalStateException("Veterinarian account is not active");
        if (user.getRole() == null || !"VETERINARIAN".equals(user.getRole().getRoleName()))
            throw new IllegalStateException("User does not have Veterinarian role");
        return user;
    }

    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordById(String medicalRecordId) {
        MedicalRecord record = medicalRecordRepository.findById(medicalRecordId)
                .orElseThrow(() -> new IllegalArgumentException("Medical record not found"));
        return buildResponse(record);
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getMedicalHistory(String horseId) {
        HealthProfile profile = healthProfileRepository.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new IllegalArgumentException("Health profile not found"));
        return medicalRecordRepository.findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.getProfileId())
                .stream().map(this::buildResponse).toList();
    }

    @Transactional(readOnly = true)
    public Optional<MedicalRecordResponse> getPreviousConfirmedExamination(String horseId) {
        HealthProfile profile = healthProfileRepository.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new IllegalArgumentException("Health profile not found"));
        return medicalRecordRepository
                .findFirstByHealthProfile_ProfileIdAndStatusOrderByExaminedAtDesc(
                        profile.getProfileId(), "CONFIRMED")
                .map(this::buildResponse);
    }

    private String generateId(String prefix) {
        return prefix + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 10).toUpperCase(Locale.ROOT);
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
