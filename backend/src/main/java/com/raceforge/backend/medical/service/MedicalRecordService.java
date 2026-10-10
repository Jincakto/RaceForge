package com.raceforge.backend.medical.service;

import com.raceforge.backend.medical.dto.*;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.repository.*;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;

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
    public MedicalRecordResponse createMedicalRecord(MedicalRecordCreateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Medical record request is required.");
        }
        HealthProfile healthProfile = healthProfileRepository.findById(request.getProfileId())
                .orElseThrow(() -> new IllegalArgumentException("Health profile not found."));
        User veterinarian = getVeterinarian(request.getVeterinarianId());

        MedicalEvaluationResult evaluation = medicalEvaluationService.evaluate(
                request.getExamType(), request.getVitalSign(), request.getClinicalExams());

        MedicalRecord record = new MedicalRecord();
        record.setMedicalRecordId(generateId("MED"));
        record.setHealthProfile(healthProfile);
        record.setVeterinarian(veterinarian);
        record.setExamType(request.getExamType().trim().toUpperCase(Locale.ROOT));
        record.setExaminedAt(request.getExaminedAt());
        record.setHealthStatus(request.getHealthStatus());
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatment(request.getTreatment());
        record.setMedication(request.getMedication());
        record.setCareRecommendation(request.getCareRecommendation());
        record.setNotes(request.getNotes());
        record.setSystemNote(evaluation.systemNote());
        record.setTrainingNote(evaluation.trainingNote());
        record.setStatus("DRAFT");

        if (request.getCorrectionOfId() != null
                && !request.getCorrectionOfId().isBlank()) {
            MedicalRecord original = medicalRecordRepository.findById(request.getCorrectionOfId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Original medical record not found."));
            if (!original.getHealthProfile().getProfileId().equals(healthProfile.getProfileId())) {
                throw new IllegalArgumentException(
                        "Correction must reference a record belonging to the same horse.");
            }
            record.setCorrectionOf(original);
        }

        medicalRecordRepository.save(record);
        saveVitalSign(record, request.getVitalSign());
        saveClinicalExams(record, request.getClinicalExams());
        return buildResponse(record);
    }

    private void saveVitalSign(MedicalRecord record, MedicalVitalSignRequest request) {
        if (request == null) {
            return;
        }
        MedicalVitalSign vitalSign = new MedicalVitalSign();
        vitalSign.setVitalSignId(generateId("VIT"));
        vitalSign.setMedicalRecord(record);
        vitalSign.setBodyTemperature(request.getBodyTemperature());
        vitalSign.setRestingHeartRate(request.getRestingHeartRate());
        vitalSign.setRestingRespiratoryRate(request.getRestingRespiratoryRate());
        medicalVitalSignRepository.save(vitalSign);
    }

    private void saveClinicalExams(MedicalRecord record,
                                   List<MedicalClinicalExamRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }
        for (MedicalClinicalExamRequest request : requests) {

            if (request == null || isBlank(request.getExaminationArea())
                    || isBlank(request.getConditionStatus())) {
                continue;
            }
            MedicalClinicalExam exam = new MedicalClinicalExam();
            exam.setClinicalExamId(generateId("CLN"));
            exam.setMedicalRecord(record);
            exam.setExaminationArea(normalize(request.getExaminationArea()));
            exam.setConditionStatus(normalize(request.getConditionStatus()));
            exam.setAbnormalityType(request.getAbnormalityType());
            exam.setSeverity(isBlank(request.getSeverity())
                    ? null : normalize(request.getSeverity()));
            exam.setNotes(request.getNotes());
            medicalClinicalExamRepository.save(exam);
        }
    }

    private String generateId(String prefix) {
        return prefix + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 10).toUpperCase(Locale.ROOT);
    }

    private MedicalRecordResponse buildResponse(MedicalRecord record) {
        MedicalRecordResponse response = new MedicalRecordResponse();
        response.setMedicalRecordId(record.getMedicalRecordId());
        response.setProfileId(record.getHealthProfile().getProfileId());
        response.setVeterinarianId(record.getVeterinarian().getUserId());
        if (record.getCorrectionOf() != null) {
            response.setCorrectionOfId(record.getCorrectionOf().getMedicalRecordId());
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

        medicalVitalSignRepository.findByMedicalRecord_MedicalRecordId(
                record.getMedicalRecordId()).ifPresent(vitalSign -> {
            MedicalVitalSignResponse vitalResponse = new MedicalVitalSignResponse();
            vitalResponse.setVitalSignId(vitalSign.getVitalSignId());
            vitalResponse.setBodyTemperature(vitalSign.getBodyTemperature());
            vitalResponse.setRestingHeartRate(vitalSign.getRestingHeartRate());
            vitalResponse.setRestingRespiratoryRate(vitalSign.getRestingRespiratoryRate());
            response.setVitalSign(vitalResponse);
        });

        List<MedicalClinicalExam> exams = medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId());
        List<MedicalClinicalExamResponse> examResponses = exams.stream().map(exam -> {
            MedicalClinicalExamResponse examResponse = new MedicalClinicalExamResponse();
            examResponse.setClinicalExamId(exam.getClinicalExamId());
            examResponse.setExaminationArea(exam.getExaminationArea());
            examResponse.setConditionStatus(exam.getConditionStatus());
            examResponse.setAbnormalityType(exam.getAbnormalityType());
            examResponse.setSeverity(exam.getSeverity());
            examResponse.setNotes(exam.getNotes());
            return examResponse;
        }).toList();
        response.setClinicalExams(examResponses);
        return response;
    }

    private User getVeterinarian(String veterinarianId) {
        User user = userRepository.findDetailedById(veterinarianId)
                .orElseThrow(() -> new IllegalArgumentException("Veterinarian not found."));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new IllegalStateException("Veterinarian account is not active.");
        }
        if (user.getRole() == null
                || !"VETERINARIAN".equals(user.getRole().getRoleName())) {
            throw new IllegalStateException("User does not have Veterinarian role.");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordById(String medicalRecordId) {
        MedicalRecord record = medicalRecordRepository.findById(medicalRecordId)
                .orElseThrow(() -> new IllegalArgumentException("Medical record not found."));
        return buildResponse(record);
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getMedicalHistory(String horseId) {
        HealthProfile profile = healthProfileRepository.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new IllegalArgumentException("Health profile not found."));
        return medicalRecordRepository
                .findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.getProfileId())
                .stream().map(this::buildResponse).toList();
    }

    @Transactional(readOnly = true)
    public Optional<MedicalRecordResponse> getPreviousConfirmedExamination(String horseId) {
        HealthProfile profile = healthProfileRepository.findByHorse_HorseId(horseId)
                .orElseThrow(() -> new IllegalArgumentException("Health profile not found."));
        return medicalRecordRepository
                .findFirstByHealthProfile_ProfileIdAndStatusOrderByExaminedAtDesc(
                        profile.getProfileId(), "CONFIRMED")
                .map(this::buildResponse);
    }

    private String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
