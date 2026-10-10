package com.raceforge.backend.medical.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.horse.entity.Horse;

import com.raceforge.backend.medical.dto.*;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.mapper.MedicalRecordMapper;
import com.raceforge.backend.medical.repository.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MedicalRecordService {
    private final HealthProfileRepository healthProfileRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalVitalSignRepository medicalVitalSignRepository;
    private final MedicalClinicalExamRepository medicalClinicalExamRepository;
    private final UserRepository userRepository;
    private final MedicalEvaluationService medicalEvaluationService;
    private final MedicalRecordMapper medicalRecordMapper;
    private final TrainingLockService trainingLockService;

    public MedicalRecordService(
            HealthProfileRepository healthProfileRepository,
            MedicalRecordRepository medicalRecordRepository,
            MedicalVitalSignRepository medicalVitalSignRepository,
            MedicalClinicalExamRepository medicalClinicalExamRepository,
            UserRepository userRepository,
            MedicalEvaluationService medicalEvaluationService,
            MedicalRecordMapper medicalRecordMapper,
            TrainingLockService trainingLockService) {
        this.healthProfileRepository = healthProfileRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicalVitalSignRepository = medicalVitalSignRepository;
        this.medicalClinicalExamRepository = medicalClinicalExamRepository;
        this.userRepository = userRepository;
        this.medicalEvaluationService = medicalEvaluationService;
        this.medicalRecordMapper = medicalRecordMapper;
        this.trainingLockService = trainingLockService;
    }

    @Transactional
    public MedicalRecordResponse createMedicalRecord(MedicalRecordCreateRequest request) {
        HealthProfile profile = healthProfileRepository.findById(request.getProfileId())
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));
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
                    .orElseThrow(() -> new ResourceNotFoundException("Original medical record not found"));
            if (!original.getHealthProfile().getProfileId().equals(profile.getProfileId())) {
                throw new BusinessRuleException("Correction must belong to the same health profile");
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
        if (request == null) {
            return;
        }
        MedicalVitalSign entity = new MedicalVitalSign();
        entity.setVitalSignId(generateId("VIT"));
        entity.setMedicalRecord(record);
        entity.setBodyTemperature(request.getBodyTemperature());
        entity.setRestingHeartRate(request.getRestingHeartRate());
        entity.setRestingRespiratoryRate(request.getRestingRespiratoryRate());
        medicalVitalSignRepository.save(entity);
    }

    private void saveClinicalExams(MedicalRecord record, List<MedicalClinicalExamRequest> requests) {
        if (requests == null) {
            return;
        }
        for (MedicalClinicalExamRequest request : requests) {

            if (request == null || isBlank(request.getExaminationArea())
                    || isBlank(request.getConditionStatus())) {
                continue;
            }
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
                .orElseThrow(() -> new ResourceNotFoundException("Veterinarian not found"));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new BusinessRuleException("Veterinarian account is not active");
        }
        if (user.getRole() == null || !"VETERINARIAN".equals(user.getRole().getRoleName())) {
            throw new BusinessRuleException("User does not have Veterinarian role");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordById(String medicalRecordId) {
        MedicalRecord record = medicalRecordRepository.findById(medicalRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        return buildResponse(record);
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getMedicalHistory(String horseId) {
        HealthProfile profile = healthProfileRepository.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));
        return medicalRecordRepository.findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.getProfileId())
                .stream().map(this::buildResponse).toList();
    }

    @Transactional(readOnly = true)
    public Optional<MedicalRecordResponse> getPreviousConfirmedExamination(String horseId) {
        HealthProfile profile = healthProfileRepository.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));
        return medicalRecordRepository
                .findFirstByHealthProfile_ProfileIdAndStatusOrderByExaminedAtDesc(
                        profile.getProfileId(), "CONFIRMED")
                .map(this::buildResponse);
    }

    @Transactional
    public MedicalRecordResponse updateMedicalDraft(String medicalRecordId,
                                                     String veterinarianId,
                                                     MedicalRecordUpdateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Update request is required");
        }

        User veterinarian = getVeterinarian(veterinarianId);
        MedicalRecord record = medicalRecordRepository.findById(medicalRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        if (!"DRAFT".equals(record.getStatus())) {
            throw new BusinessRuleException("Only DRAFT medical records can be edited");
        }

        if (!record.getVeterinarian().getUserId().equals(veterinarian.getUserId())) {
            throw new BusinessRuleException("Only the assigned veterinarian can edit this record");
        }

        if (request.getExaminedAt() == null) {
            throw new IllegalArgumentException("ExaminedAt is required");
        }

        String healthStatus = normalize(request.getHealthStatus());
        if (healthStatus != null && !List.of("READY", "INJURED", "QUARANTINED").contains(healthStatus)) {
            throw new IllegalArgumentException("Unsupported horse health status: " + healthStatus);
        }

        MedicalEvaluationResult evaluation = medicalEvaluationService.evaluate(
                record.getExamType(), request.getVitalSign(), request.getClinicalExams());
        record.setExaminedAt(request.getExaminedAt());
        record.setHealthStatus(healthStatus);
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatment(request.getTreatment());
        record.setMedication(request.getMedication());
        record.setCareRecommendation(request.getCareRecommendation());
        record.setNotes(request.getNotes());
        record.setSystemNote(evaluation.systemNote());
        record.setTrainingNote(evaluation.trainingNote());
        medicalRecordRepository.save(record);

        MedicalVitalSign existingVital = medicalVitalSignRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId).orElse(null);
        MedicalVitalSignRequest newVital = request.getVitalSign();
        if (newVital == null) {
            if (existingVital != null) {
                medicalVitalSignRepository.delete(existingVital);
            }
        } else {
            MedicalVitalSign vital = existingVital == null ? new MedicalVitalSign() : existingVital;
            if (existingVital == null) {
                vital.setVitalSignId(generateId("VIT"));
                vital.setMedicalRecord(record);
            }

            vital.setBodyTemperature(newVital.getBodyTemperature());
            vital.setRestingHeartRate(newVital.getRestingHeartRate());
            vital.setRestingRespiratoryRate(newVital.getRestingRespiratoryRate());
            medicalVitalSignRepository.save(vital);
        }

        List<MedicalClinicalExam> oldExams = medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId);
        medicalClinicalExamRepository.deleteAll(oldExams);
        medicalClinicalExamRepository.flush();
        saveClinicalExams(record, request.getClinicalExams());

        return buildResponse(record);
    }


    @Transactional
    public MedicalRecordResponse confirmMedicalRecord(String medicalRecordId,
                                                       String veterinarianId) {
        User veterinarian = getVeterinarian(veterinarianId);
        MedicalRecord record = medicalRecordRepository.findById(medicalRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        if (!"DRAFT".equals(record.getStatus())) {
            throw new BusinessRuleException("Only DRAFT medical records can be confirmed");
        }

        if (!record.getVeterinarian().getUserId().equals(veterinarian.getUserId())) {
            throw new BusinessRuleException("Only the assigned veterinarian can confirm this record");
        }

        MedicalVitalSign savedVital = medicalVitalSignRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId).orElse(null);
        List<MedicalClinicalExam> savedExams = medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId);
        MedicalVitalSignRequest vitalRequest = null;
        if (savedVital != null) {
            vitalRequest = new MedicalVitalSignRequest();
            vitalRequest.setBodyTemperature(savedVital.getBodyTemperature());
            vitalRequest.setRestingHeartRate(savedVital.getRestingHeartRate());
            vitalRequest.setRestingRespiratoryRate(savedVital.getRestingRespiratoryRate());
        }

        List<MedicalClinicalExamRequest> examRequests = new ArrayList<>();
        for (MedicalClinicalExam saved : savedExams) {
            MedicalClinicalExamRequest exam = new MedicalClinicalExamRequest();
            exam.setExaminationArea(saved.getExaminationArea());
            exam.setConditionStatus(saved.getConditionStatus());
            exam.setSeverity(saved.getSeverity());
            exam.setAbnormalityType(saved.getAbnormalityType());
            exam.setNotes(saved.getNotes());
            examRequests.add(exam);
        }

        MedicalEvaluationResult evaluation = medicalEvaluationService.evaluate(
                record.getExamType(), vitalRequest, examRequests);
        if (evaluation.level() == MedicalEvaluationResult.EvaluationLevel.INCOMPLETE) {
            throw new BusinessRuleException("Incomplete medical examination cannot be confirmed");
        }

        String healthStatus = normalize(record.getHealthStatus());
        if (healthStatus == null || healthStatus.isBlank()) {
            throw new BusinessRuleException("Veterinarian must provide health status before confirmation");
        }

        if (!List.of("READY", "INJURED", "QUARANTINED").contains(healthStatus)) {
            throw new IllegalArgumentException("Unsupported horse health status: " + healthStatus);
        }

        if (evaluation.level() == MedicalEvaluationResult.EvaluationLevel.CRITICAL
                && "READY".equals(healthStatus)) {
            throw new BusinessRuleException(
                    "CRITICAL examination cannot be confirmed with READY health status");
        }

        Horse horse = record.getHealthProfile().getHorse();
        boolean mustLock = evaluation.suggestedLock()
                || "INJURED".equals(healthStatus)
                || "QUARANTINED".equals(healthStatus);
        record.setHealthStatus(healthStatus);
        record.setSystemNote(evaluation.systemNote());
        record.setTrainingNote(evaluation.trainingNote());
        record.setStatus("CONFIRMED");
        record.setConfirmedAt(LocalDateTime.now());
        horse.setHealthStatus(healthStatus);
        if (mustLock) {
            String reason = "Confirmed medical examination " + medicalRecordId
                    + ": " + evaluation.systemNote()
                    + ("INJURED".equals(healthStatus) || "QUARANTINED".equals(healthStatus)
                       ? " Health status: " + healthStatus + "." : "");
            if (reason.length() > 1000) {
                reason = reason.substring(0, 1000);
            }
            trainingLockService.lockFromConfirmedExamination(horse, record, veterinarian, reason);
        }

        medicalRecordRepository.save(record);
        return buildResponse(record);
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
