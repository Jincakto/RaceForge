package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.medical.dto.*;
import com.raceforge.backend.medical.entity.*;
import com.raceforge.backend.medical.mapper.MedicalRecordMapper;
import com.raceforge.backend.medical.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
public class MedicalRecordService {
<<<<<<< HEAD
    private final com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator;

    private static final Set<String> FINAL_CONCLUSIONS =
            Set.of("FIT", "FIT_WITH_MONITORING", "NOT_FIT");
    private static final int MIN_REASON_LENGTH = 10; // Matches current FE validation.
    private static final int MAX_REASON_LENGTH = 1000;

=======
    @org.springframework.beans.factory.annotation.Autowired private com.raceforge.backend.horse.service.VetAssignmentService assignments;
>>>>>>> 76de6e5 (luu code)
    private final HealthProfileRepository healthProfileRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalVitalSignRepository medicalVitalSignRepository;
    private final MedicalClinicalExamRepository medicalClinicalExamRepository;
    private final UserRepository userRepository;
    private final MedicalEvaluationService medicalEvaluationService;
    private final MedicalRecordMapper medicalRecordMapper;
    private final TrainingLockService trainingLockService;
    private final AuditLogService auditLogService;
    private final MedicalAssignmentService medicalAssignments;

    public MedicalRecordService(
            HealthProfileRepository healthProfileRepository,
            MedicalRecordRepository medicalRecordRepository,
            MedicalVitalSignRepository medicalVitalSignRepository,
            MedicalClinicalExamRepository medicalClinicalExamRepository,
            UserRepository userRepository,
            MedicalEvaluationService medicalEvaluationService,
            MedicalRecordMapper medicalRecordMapper,
            TrainingLockService trainingLockService,
            AuditLogService auditLogService,
            MedicalAssignmentService medicalAssignments,
            com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator) {
        this.idAllocator = idAllocator;
        this.healthProfileRepository = healthProfileRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicalVitalSignRepository = medicalVitalSignRepository;
        this.medicalClinicalExamRepository = medicalClinicalExamRepository;
        this.userRepository = userRepository;
        this.medicalEvaluationService = medicalEvaluationService;
        this.medicalRecordMapper = medicalRecordMapper;
        this.trainingLockService = trainingLockService;
        this.auditLogService = auditLogService;
        this.medicalAssignments = medicalAssignments;
    }

    /**
     * Evaluates an in-progress examination without saving a draft, choosing a
     * conclusion, confirming a record or changing the horse's Training Lock.
     * The veterinarian must have accepted an assignment for this horse.
     */
    @Transactional(readOnly = true)
    public MedicalEvaluationPreviewResponse previewEvaluation(
            String horseId, String veterinarianId, MedicalEvaluationPreviewRequest request) {
        if (request == null || horseId == null || horseId.isBlank()) {
            throw new IllegalArgumentException("Horse ID and examination data are required");
        }
        getVeterinarian(veterinarianId);
        medicalAssignments.requireAccepted(horseId, veterinarianId);

        MedicalEvaluationResult evaluation = medicalEvaluationService.evaluate(
                request.examType(), request.vitalSign(), request.clinicalExams());
        return new MedicalEvaluationPreviewResponse(
                evaluation.level().name(),
                suggestedConclusion(evaluation),
                evaluation.systemNote(),
                evaluation.trainingNote(),
                evaluation.suggestedLock()
        );
    }

    @Transactional
    public MedicalRecordResponse createMedicalRecord(MedicalRecordCreateRequest request) {
        if (request == null || request.getProfileId() == null || request.getVeterinarianId() == null) {
            throw new IllegalArgumentException("Profile and veterinarian are required");
        }
        HealthProfile profile = healthProfileRepository.findById(request.getProfileId())
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));
<<<<<<< HEAD
        User veterinarian = getVeterinarian(request.getVeterinarianId());
        medicalAssignments.requireAccepted(profile.getHorse().getHorseId(), veterinarian.getUserId());

=======
        String assignment=assignments.requireAccepted(profile.getHorse().getHorseId(),request.getVeterinarianId(),request.getAssignmentId());
>>>>>>> 76de6e5 (luu code)
        MedicalRecord record = new MedicalRecord();
        record.setMedicalRecordId(nextMedicalRecordId());
        record.setHealthProfile(profile);
        record.setVeterinarian(veterinarian);
        record.setExamType(normalize(request.getExamType()));
        record.setExaminedAt(request.getExaminedAt());
<<<<<<< HEAD
=======
        record.setHealthStatus(request.getHealthStatus());
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatment(request.getTreatment());
        record.setMedication(request.getMedication());
        record.setCareRecommendation(request.getCareRecommendation());
        record.setNotes(request.getNotes());
        record.setEligibilityReason(request.getEligibilityReason());record.setFinalConclusion(request.getFinalConclusion());record.setOverrideReason(request.getOverrideReason());record.setMonitoringNote(request.getMonitoringNote());record.setTrainingLockReason(request.getTrainingLockReason());
        record.setIdealWeight(request.getIdealWeight());record.setBodyConditionScore(request.getBodyConditionScore());
>>>>>>> 76de6e5 (luu code)
        record.setStatus("DRAFT");
        // No official eligibility decision until the veterinarian confirms.
        record.setTrainingEligible(null);
        record.setEligibilityReason(null);
        if (request.getCorrectionOfId() != null) {
            MedicalRecord original = medicalRecordRepository.findById(request.getCorrectionOfId())
                    .orElseThrow(() -> new ResourceNotFoundException("Original medical record not found"));
            if (!original.getHealthProfile().getProfileId().equals(profile.getProfileId())) {
                throw new BusinessRuleException("Correction must belong to the same health profile");
            }
            record.setCorrectionOf(original);
        }

<<<<<<< HEAD
        updateDecisionFields(record, request.getFinalConclusion(), request.getOverrideReason(),
                request.getMonitoringNote(), request.getTrainingLockReason());
=======
        MedicalEvaluationResult evaluation = medicalEvaluationService.evaluate(
                request.getExamType(), request.getVitalSign(), request.getClinicalExams());
        record.setSuggestedConclusion(suggested(evaluation));
        record.setSystemNote(evaluation.systemNote());
        record.setTrainingNote(evaluation.trainingNote());
        medicalRecordRepository.save(record);

        medicalRecordRepository.flush();assignments.attach(assignment,record.getMedicalRecordId());
        saveVitalSign(record, request.getVitalSign());
        saveClinicalExams(record, request.getClinicalExams());
        auditLogService.record(record.getVeterinarian().getUserId(), profile.getHorse().getHorseId(), "MEDICAL_RECORD", record.getMedicalRecordId(), "MEDICAL_RECORD_CREATED", "SUCCESS", null);

        return buildResponse(record);
    }

    private void saveVitalSign(MedicalRecord record, MedicalVitalSignRequest request) {
        if (request == null) {
            return;
        }
        MedicalVitalSign entity = new MedicalVitalSign();
        entity.setMedicalRecord(record);
        validateWeight(request.getWeight());
        entity.setWeight(request.getWeight());
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
            entity.setMedicalRecord(record);
            entity.setExaminationArea(normalize(request.getExaminationArea()));
            entity.setConditionStatus(normalize(request.getConditionStatus()));
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
        assignments.requireRecord(record.getHealthProfile().getHorse().getHorseId(),veterinarianId,medicalRecordId);
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
>>>>>>> 76de6e5 (luu code)
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatment(request.getTreatment());
        record.setMedication(request.getMedication());
        record.setCareRecommendation(request.getCareRecommendation());
        record.setNotes(request.getNotes());
<<<<<<< HEAD
        applySuggestion(record, medicalEvaluationService.evaluate(
                record.getExamType(), request.getVitalSign(), request.getClinicalExams()));

        // With an application-assigned String ID, Spring Data may use merge().
        // Always use the managed instance returned by save for child records.
        record = medicalRecordRepository.save(record);
        saveVitalSign(record, request.getVitalSign());
        saveClinicalExams(record, request.getClinicalExams());
        auditLogService.record(veterinarian.getUserId(), profile.getHorse().getHorseId(),
                "MEDICAL_RECORD", record.getMedicalRecordId(), "MEDICAL_RECORD_CREATED", "SUCCESS", null);
        return buildResponse(record);
    }

    @Transactional
    public MedicalRecordResponse updateMedicalDraft(String medicalRecordId,
                                                    String veterinarianId,
                                                    MedicalRecordUpdateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Update request is required");
        }
        MedicalRecord record = requireOwnedDraft(medicalRecordId, veterinarianId);
        record.setTrainingEligible(null);
        record.setEligibilityReason(null);
        if (request.getExaminedAt() == null) {
            throw new IllegalArgumentException("Examination date is required");
        }

        record.setExaminedAt(request.getExaminedAt());
        updateDecisionFields(record, request.getFinalConclusion(), request.getOverrideReason(),
                request.getMonitoringNote(), request.getTrainingLockReason());
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatment(request.getTreatment());
        record.setMedication(request.getMedication());
        record.setCareRecommendation(request.getCareRecommendation());
        record.setNotes(request.getNotes());
        applySuggestion(record, medicalEvaluationService.evaluate(
                record.getExamType(), request.getVitalSign(), request.getClinicalExams()));
=======
        record.setEligibilityReason(request.getEligibilityReason());record.setFinalConclusion(request.getFinalConclusion());record.setOverrideReason(request.getOverrideReason());record.setMonitoringNote(request.getMonitoringNote());record.setTrainingLockReason(request.getTrainingLockReason());
        record.setIdealWeight(request.getIdealWeight());record.setBodyConditionScore(request.getBodyConditionScore());
        record.setSuggestedConclusion(suggested(evaluation));
        record.setSystemNote(evaluation.systemNote());
        record.setTrainingNote(evaluation.trainingNote());
>>>>>>> 76de6e5 (luu code)
        medicalRecordRepository.save(record);

        MedicalVitalSign existing = medicalVitalSignRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId).orElse(null);
        if (request.getVitalSign() == null) {
            if (existing != null) {
                medicalVitalSignRepository.delete(existing);
            }
        } else {
            MedicalVitalSign vital = existing == null ? new MedicalVitalSign() : existing;
            if (existing == null) vital.setVitalSignId(idAllocator.next("VIT"));
            if (existing == null) {
                vital.setMedicalRecord(record);
            }
<<<<<<< HEAD
            copyVitalSign(vital, request.getVitalSign());
=======

            validateWeight(newVital.getWeight());
            vital.setWeight(newVital.getWeight());
            vital.setBodyTemperature(newVital.getBodyTemperature());
            vital.setRestingHeartRate(newVital.getRestingHeartRate());
            vital.setRestingRespiratoryRate(newVital.getRestingRespiratoryRate());
>>>>>>> 76de6e5 (luu code)
            medicalVitalSignRepository.save(vital);
        }

        List<MedicalClinicalExam> oldExams = medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId);
        medicalClinicalExamRepository.deleteAll(oldExams);
        medicalClinicalExamRepository.flush();
        saveClinicalExams(record, request.getClinicalExams());
        auditLogService.record(veterinarianId, record.getHealthProfile().getHorse().getHorseId(),
                "MEDICAL_RECORD", medicalRecordId, "MEDICAL_DRAFT_UPDATED", "SUCCESS", null);
        return buildResponse(record);
    }

    /**
     * Confirms the conclusion already saved in DRAFT. A UI that sends the final
     * selection only on "Review & Save" must first update the draft (or the
     * controller must be extended later to accept a confirm request body).
     */
    @Transactional
    public MedicalRecordResponse confirmMedicalRecord(String medicalRecordId,
<<<<<<< HEAD
                                                      String veterinarianId) {
        MedicalRecord record = requireOwnedDraft(medicalRecordId, veterinarianId);
=======
                                                       String veterinarianId) {
        User veterinarian = getVeterinarian(veterinarianId);
        MedicalRecord record = medicalRecordRepository.findById(medicalRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        assignments.requireRecord(record.getHealthProfile().getHorse().getHorseId(),veterinarianId,medicalRecordId);
        if (!"DRAFT".equals(record.getStatus())) {
            throw new BusinessRuleException("Only DRAFT medical records can be confirmed");
        }

        if (!record.getVeterinarian().getUserId().equals(veterinarian.getUserId())) {
            throw new BusinessRuleException("Only the assigned veterinarian can confirm this record");
        }

>>>>>>> 76de6e5 (luu code)
        MedicalVitalSign savedVital = medicalVitalSignRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId).orElse(null);
        List<MedicalClinicalExam> savedExams = medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId);
<<<<<<< HEAD
=======
        MedicalVitalSignRequest vitalRequest = null;
        if (savedVital != null) {
            vitalRequest = new MedicalVitalSignRequest();
            vitalRequest.setWeight(savedVital.getWeight());
            vitalRequest.setBodyTemperature(savedVital.getBodyTemperature());
            vitalRequest.setRestingHeartRate(savedVital.getRestingHeartRate());
            vitalRequest.setRestingRespiratoryRate(savedVital.getRestingRespiratoryRate());
        }

        List<MedicalClinicalExamRequest> examRequests = new ArrayList<>();
        for (MedicalClinicalExam saved : savedExams) {
            MedicalClinicalExamRequest exam = new MedicalClinicalExamRequest();
            exam.setExaminationArea(saved.getExaminationArea());
            exam.setConditionStatus(saved.getConditionStatus());
            exam.setNotes(saved.getNotes());
            examRequests.add(exam);
        }
>>>>>>> 76de6e5 (luu code)

        MedicalEvaluationResult evaluation = medicalEvaluationService.evaluate(
                record.getExamType(), toVitalRequest(savedVital), toExamRequests(savedExams));
        if (evaluation.level() == MedicalEvaluationResult.EvaluationLevel.INCOMPLETE) {
            throw new BusinessRuleException("Complete all vital signs and four clinical areas before confirmation");
        }
<<<<<<< HEAD
        String suggested = suggestedConclusion(evaluation);
        String selected = normalize(record.getFinalConclusion());
        if (selected == null || !FINAL_CONCLUSIONS.contains(selected)) {
            throw new BusinessRuleException("Veterinarian must select a final conclusion");
=======

        String conclusion=normalize(record.getFinalConclusion());
        if(!List.of("FIT","FIT_WITH_MONITORING","NOT_FIT").contains(conclusion==null?"":conclusion))throw new BusinessRuleException("Vet must select FIT, FIT_WITH_MONITORING or NOT_FIT");
        if(record.getEligibilityReason()==null||record.getEligibilityReason().isBlank())throw new BusinessRuleException("Eligibility reason is required");
        record.setFinalConclusion(conclusion);record.setTrainingEligible(!"NOT_FIT".equals(conclusion));
        if(!conclusion.equals(suggested(evaluation))&&(record.getOverrideReason()==null||record.getOverrideReason().isBlank()))throw new BusinessRuleException("An override reason is required when the vet differs from the system suggestion");
        if("FIT_WITH_MONITORING".equals(conclusion)&&(record.getMonitoringNote()==null||record.getMonitoringNote().isBlank()))throw new BusinessRuleException("Monitoring instructions are required");
        if("NOT_FIT".equals(conclusion)&&(record.getTrainingLockReason()==null||record.getTrainingLockReason().isBlank()))throw new BusinessRuleException("A training lock reason is required");
        String healthStatus = normalize(record.getHealthStatus());
        if(Boolean.TRUE.equals(record.getTrainingEligible())&&!"READY".equals(healthStatus))throw new BusinessRuleException("Only a READY examination may authorize training");
        if (healthStatus == null || healthStatus.isBlank()) {
            throw new BusinessRuleException("Veterinarian must provide health status before confirmation");
>>>>>>> 76de6e5 (luu code)
        }
        if (!selected.equals(suggested)) {
            requireExplanation(record.getOverrideReason(), "Reason for choosing a different conclusion");
        }
        if ("FIT_WITH_MONITORING".equals(selected)) {
            requireExplanation(record.getMonitoringNote(), "Monitoring instructions");
        }
        if ("NOT_FIT".equals(selected)) {
            requireExplanation(record.getTrainingLockReason(), "Training Lock reason");
        }

        Horse horse = record.getHealthProfile().getHorse();
<<<<<<< HEAD
        User veterinarian = record.getVeterinarian();
        applySuggestion(record, evaluation); // Recompute: never trust FE-supplied suggestion.
        record.setFinalConclusion(selected);
        applyConfirmedEligibility(record, selected);
        record.setStatus("CONFIRMED");
        record.setConfirmedAt(LocalDateTime.now());
=======
        boolean mustLock = !Boolean.TRUE.equals(record.getTrainingEligible()) || evaluation.suggestedLock()
                || "INJURED".equals(healthStatus)
                || "QUARANTINED".equals(healthStatus);
        record.setHealthStatus(healthStatus);
        record.setSuggestedConclusion(suggested(evaluation));
        record.setSystemNote(evaluation.systemNote());
        record.setTrainingNote(evaluation.trainingNote());
        if(savedVital!=null && savedVital.getWeight()!=null && savedVital.getWeight().signum()<=0)throw new BusinessRuleException("Measured weight must be positive");
        record.setStatus("CONFIRMED");
        record.setConfirmedAt(LocalDateTime.now());
        horse.setHealthStatus(healthStatus);
        if (mustLock) {
            String reason = "Confirmed medical examination " + medicalRecordId
                    + ": " + (record.getTrainingLockReason()==null?evaluation.systemNote():record.getTrainingLockReason())
                    + ("INJURED".equals(healthStatus) || "QUARANTINED".equals(healthStatus)
                       ? " Health status: " + healthStatus + "." : "");
            if (reason.length() > 1000) {
                reason = reason.substring(0, 1000);
            }
            trainingLockService.lockFromConfirmedExamination(horse, record, veterinarian, reason);
        }
>>>>>>> 76de6e5 (luu code)

        // This is fitness for training, not a veterinary diagnosis of injury.
        // HorsePackage gating already requires READY for normal training packages.
        String fitnessStatus = "NOT_FIT".equals(selected) ? "NOT_FIT" : "READY";
        record.setHealthStatus(fitnessStatus);
        horse.setHealthStatus(fitnessStatus);
        medicalRecordRepository.save(record);
<<<<<<< HEAD

        // Only the veterinarian's confirmed decision causes a lock. The automatic
        // CRITICAL suggestion by itself never locks a horse.
        if ("NOT_FIT".equals(selected)) {
            trainingLockService.lockFromConfirmedExamination(horse, record, veterinarian,
                    record.getTrainingLockReason().trim());
        }
        // Deliberately do not auto-unlock on FIT / FIT_WITH_MONITORING.
        medicalAssignments.complete(horse.getHorseId(), veterinarianId, medicalRecordId);
        auditLogService.record(veterinarianId, horse.getHorseId(), "MEDICAL_RECORD",
                medicalRecordId, "MEDICAL_RECORD_CONFIRMED", "SUCCESS", null);
=======
        medicalRecordRepository.flush();assignments.complete(medicalRecordId);
        auditLogService.record(veterinarianId, horse.getHorseId(), "MEDICAL_RECORD", medicalRecordId, "MEDICAL_RECORD_CONFIRMED", "SUCCESS", null);
>>>>>>> 76de6e5 (luu code)
        return buildResponse(record);
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
        return medicalRecordRepository
                .findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.getProfileId())
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

    /**
     * Allocate a prefixed medical ID before persistence. The database sequence
     * will be added when the final schema/Flyway migrations are consolidated.
     */
    private String nextMedicalRecordId() {
        return idAllocator.next("MED");
    }

    private MedicalRecord requireOwnedDraft(String recordId, String veterinarianId) {
        User veterinarian = getVeterinarian(veterinarianId);
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        if (!"DRAFT".equals(record.getStatus())) {
            throw new BusinessRuleException("Only DRAFT medical records may be edited or confirmed");
        }
        if (!record.getVeterinarian().getUserId().equals(veterinarian.getUserId())) {
            throw new BusinessRuleException("Only the record's veterinarian may modify or confirm it");
        }
        medicalAssignments.requireAccepted(record.getHealthProfile().getHorse().getHorseId(), veterinarianId);
        return record;
    }

    private void updateDecisionFields(MedicalRecord record, String finalConclusion,
                                      String overrideReason, String monitoringNote,
                                      String trainingLockReason) {
        String selected = normalize(finalConclusion);
        if (selected != null && !FINAL_CONCLUSIONS.contains(selected)) {
            throw new IllegalArgumentException("Unsupported conclusion: " + finalConclusion);
        }
        record.setFinalConclusion(selected);
        record.setOverrideReason(trimToNull(overrideReason));
        record.setMonitoringNote(trimToNull(monitoringNote));
        record.setTrainingLockReason(trimToNull(trainingLockReason));
        validateLength(record.getOverrideReason(), "Override reason");
        validateLength(record.getMonitoringNote(), "Monitoring instructions");
        validateLength(record.getTrainingLockReason(), "Training Lock reason");
    }

    /**
     * Only the veterinarian's CONFIRMED conclusion determines eligibility.
     * Never copy the automatic suggestion into trainingEligible.
     * eligibilityReason reuses the clinical explanation already entered by the Vet.
     */
    private void applyConfirmedEligibility(MedicalRecord record, String selected) {
        switch (selected) {
            case "FIT" -> {
                record.setTrainingEligible(true);
                record.setEligibilityReason(trimToNull(record.getOverrideReason()));
            }
            case "FIT_WITH_MONITORING" -> {
                record.setTrainingEligible(true);
                record.setEligibilityReason(trimToNull(record.getMonitoringNote()));
            }
            case "NOT_FIT" -> {
                record.setTrainingEligible(false);
                record.setEligibilityReason(trimToNull(record.getTrainingLockReason()));
            }
            default -> throw new BusinessRuleException("Unknown confirmed conclusion: " + selected);
        }
    }

    private void applySuggestion(MedicalRecord record, MedicalEvaluationResult evaluation) {
        record.setSuggestedConclusion(suggestedConclusion(evaluation));
        record.setSystemNote(evaluation.systemNote());
        record.setTrainingNote(evaluation.trainingNote());
    }

    private String suggestedConclusion(MedicalEvaluationResult evaluation) {
        return switch (evaluation.level()) {
            case NORMAL -> "FIT";
            case WARNING -> "FIT_WITH_MONITORING";
            case CRITICAL -> "NOT_FIT";
            case INCOMPLETE -> null;
        };
    }

    private void saveVitalSign(MedicalRecord record, MedicalVitalSignRequest request) {
        if (request == null) {
            return;
        }
        MedicalVitalSign vital = new MedicalVitalSign();
        vital.setVitalSignId(idAllocator.next("VIT"));
        vital.setMedicalRecord(record);
        copyVitalSign(vital, request);
        medicalVitalSignRepository.save(vital);
    }

    private void copyVitalSign(MedicalVitalSign vital, MedicalVitalSignRequest request) {
        vital.setBodyTemperature(request.getBodyTemperature());
        vital.setRestingHeartRate(request.getRestingHeartRate());
        vital.setRestingRespiratoryRate(request.getRestingRespiratoryRate());
        vital.setWeight(request.getWeight());
    }

    private void saveClinicalExams(MedicalRecord record, List<MedicalClinicalExamRequest> requests) {
        if (requests == null) {
            return;
        }
        for (MedicalClinicalExamRequest request : requests) {
            if (request == null || isBlank(request.getExaminationArea())
                    || isBlank(request.getConditionStatus())) {
                continue; // Partial drafts are allowed; confirmation revalidates all four.
            }
            MedicalClinicalExam exam = new MedicalClinicalExam();
            exam.setClinicalExamId(idAllocator.next("CLN"));
            exam.setMedicalRecord(record);
            exam.setExaminationArea(normalize(request.getExaminationArea()));
            exam.setConditionStatus(normalize(request.getConditionStatus()));
            exam.setNotes(trimToNull(request.getNotes()));
            medicalClinicalExamRepository.save(exam);
        }
    }

    private MedicalVitalSignRequest toVitalRequest(MedicalVitalSign saved) {
        if (saved == null) {
            return null;
        }
        MedicalVitalSignRequest request = new MedicalVitalSignRequest();
        request.setBodyTemperature(saved.getBodyTemperature());
        request.setRestingHeartRate(saved.getRestingHeartRate());
        request.setRestingRespiratoryRate(saved.getRestingRespiratoryRate());
        request.setWeight(saved.getWeight());
        return request;
    }

    private List<MedicalClinicalExamRequest> toExamRequests(List<MedicalClinicalExam> savedExams) {
        List<MedicalClinicalExamRequest> requests = new ArrayList<>();
        for (MedicalClinicalExam saved : savedExams) {
            MedicalClinicalExamRequest request = new MedicalClinicalExamRequest();
            request.setExaminationArea(saved.getExaminationArea());
            request.setConditionStatus(saved.getConditionStatus());
            request.setNotes(saved.getNotes());
            requests.add(request);
        }
        return requests;
    }

    private User getVeterinarian(String veterinarianId) {
        User user = userRepository.findDetailedById(veterinarianId)
                .orElseThrow(() -> new ResourceNotFoundException("Veterinarian not found"));
        if (!"ACTIVE".equals(user.getStatus()) || user.getRole() == null
                || !"VETERINARIAN".equals(user.getRole().getRoleName())) {
            throw new BusinessRuleException("An active veterinarian is required");
        }
        return user;
    }

    private MedicalRecordResponse buildResponse(MedicalRecord record) {
        MedicalVitalSign vital = medicalVitalSignRepository
                .findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId())
                .orElse(null);
        List<MedicalClinicalExam> exams = medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId());
        return medicalRecordMapper.toResponse(record, vital, exams);
    }

    private void requireExplanation(String value, String label) {
        if (value == null || value.trim().length() < MIN_REASON_LENGTH) {
            throw new BusinessRuleException(label + " must contain at least "
                    + MIN_REASON_LENGTH + " characters");
        }
        validateLength(value, label);
    }

    private void validateLength(String value, String label) {
        if (value != null && value.length() > MAX_REASON_LENGTH) {
            throw new IllegalArgumentException(label + " must not exceed "
                    + MAX_REASON_LENGTH + " characters");
        }
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static void validateWeight(java.math.BigDecimal weight){
        if(weight!=null && (weight.signum()<=0 || weight.scale()>2 || weight.compareTo(new java.math.BigDecimal("99999.99"))>0))throw new BusinessRuleException("weight must be positive kg within DECIMAL(7,2); this is a storage check, not a normal weight range.");
    }

    private static String suggested(MedicalEvaluationResult evaluation){
        return switch(evaluation.level()){
            case NORMAL -> "FIT";
            case WARNING -> "FIT_WITH_MONITORING";
            case CRITICAL -> "NOT_FIT";
            case INCOMPLETE -> null;
        };
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
