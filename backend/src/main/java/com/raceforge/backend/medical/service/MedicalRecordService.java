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
import java.util.Map;
import java.util.HashMap;
import java.util.HashSet;
import org.springframework.web.multipart.MultipartFile;
import com.raceforge.backend.storage.StorageService;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
public class MedicalRecordService {
    private final com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator;

    private static final Set<String> FINAL_CONCLUSIONS =
            Set.of("FIT", "FIT_WITH_MONITORING", "NOT_FIT");
    private static final int MIN_REASON_LENGTH = 10; // Matches current FE validation.
    private static final int MAX_REASON_LENGTH = 1000;

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
    // Used for private clinical evidence; injected without changing legacy test constructors.
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private StorageService storage;

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
        User veterinarian = getVeterinarian(request.getVeterinarianId());
        medicalAssignments.requireAccepted(profile.getHorse().getHorseId(), veterinarian.getUserId());

        MedicalRecord record = new MedicalRecord();
        record.setMedicalRecordId(nextMedicalRecordId());
        record.setHealthProfile(profile);
        record.setVeterinarian(veterinarian);
        record.setExamType(normalize(request.getExamType()));
        record.setExaminedAt(request.getExaminedAt());
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

        updateDecisionFields(record, request.getFinalConclusion(), request.getOverrideReason(),
                request.getMonitoringNote(), request.getTrainingLockReason());
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatment(request.getTreatment());
        record.setMedication(request.getMedication());
        record.setCareRecommendation(request.getCareRecommendation());
        record.setNotes(request.getNotes());
        applySuggestion(record, medicalEvaluationService.evaluate(
                record.getExamType(), request.getVitalSign(), request.getClinicalExams()));
        applyDraftConclusionPolicy(record);

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
        applyDraftConclusionPolicy(record);
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
            copyVitalSign(vital, request.getVitalSign());
            medicalVitalSignRepository.save(vital);
        }

        updateClinicalExams(record, request.getClinicalExams());
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
                                                      String veterinarianId) {
        MedicalRecord record = requireOwnedDraft(medicalRecordId, veterinarianId);
        MedicalVitalSign savedVital = medicalVitalSignRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId).orElse(null);
        List<MedicalClinicalExam> savedExams = medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(medicalRecordId);

        MedicalEvaluationResult evaluation = medicalEvaluationService.evaluate(
                record.getExamType(), toVitalRequest(savedVital), toExamRequests(savedExams));
        if (evaluation.level() == MedicalEvaluationResult.EvaluationLevel.INCOMPLETE) {
            throw new BusinessRuleException("Complete all vital signs and four clinical areas before confirmation");
        }
        String suggested = suggestedConclusion(evaluation);
        boolean initial = "INITIAL".equalsIgnoreCase(record.getExamType());
        String selected = initial ? suggested : normalize(record.getFinalConclusion());
        if (selected == null) selected = suggested; // Vet may accept the system suggestion.
        if (!FINAL_CONCLUSIONS.contains(selected)) {
            throw new BusinessRuleException("A valid medical conclusion is required");
        }
        // A critical finding is a hard safety gate in every examination type.
        if (evaluation.level() == MedicalEvaluationResult.EvaluationLevel.CRITICAL
                && !"NOT_FIT".equals(selected)) {
            throw new BusinessRuleException("Critical findings cannot be overridden to FIT");
        }
        if (initial) {
            // INITIAL uses the computed conclusion; the request cannot choose a different one.
            record.setOverrideReason(null);
            if ("FIT_WITH_MONITORING".equals(selected) && isBlank(record.getMonitoringNote())) {
                record.setMonitoringNote(safeSummary(evaluation.systemNote()));
            }
            if ("NOT_FIT".equals(selected) && isBlank(record.getTrainingLockReason())) {
                record.setTrainingLockReason(safeSummary(evaluation.systemNote()));
            }
        } else if (!selected.equals(suggested)) {
            requireExplanation(record.getOverrideReason(), "Reason for choosing a different conclusion");
        } else {
            // Accepting the system suggestion still records an auditable clinical reason.
            if ("FIT_WITH_MONITORING".equals(selected) && isBlank(record.getMonitoringNote())) {
                record.setMonitoringNote(safeSummary(evaluation.systemNote()));
            }
            if ("NOT_FIT".equals(selected) && isBlank(record.getTrainingLockReason())) {
                record.setTrainingLockReason(safeSummary(evaluation.systemNote()));
            }
        }
        if ("FIT_WITH_MONITORING".equals(selected)) {
            requireExplanation(record.getMonitoringNote(), "Monitoring instructions");
        }
        if ("NOT_FIT".equals(selected)) {
            requireExplanation(record.getTrainingLockReason(), "Training Lock reason");
        }

        Horse horse = record.getHealthProfile().getHorse();
        User veterinarian = record.getVeterinarian();
        applySuggestion(record, evaluation); // Recompute: never trust FE-supplied suggestion.
        record.setFinalConclusion(selected);
        applyConfirmedEligibility(record, selected);
        record.setStatus("CONFIRMED");
        record.setConfirmedAt(LocalDateTime.now());

        // This is fitness for training, not a veterinary diagnosis of injury.
        // HorsePackage gating already requires READY for normal training packages.
        String fitnessStatus = "NOT_FIT".equals(selected) ? "NOT_FIT" : "READY";
        record.setHealthStatus(fitnessStatus);
        horse.setHealthStatus(fitnessStatus);
        medicalRecordRepository.save(record);

        // Only the veterinarian's confirmed decision causes a lock. The automatic
        // CRITICAL suggestion by itself never locks a horse.
        if ("NOT_FIT".equals(selected)) {
            trainingLockService.lockFromConfirmedExamination(horse, record, veterinarian,
                    record.getTrainingLockReason().trim());
        }
        // Deliberately do not auto-unlock on FIT / FIT_WITH_MONITORING.
        // Assignment remains accepted: a veterinarian may examine this horse
        // again without new approval from the Club Manager.
        auditLogService.record(veterinarianId, horse.getHorseId(), "MEDICAL_RECORD",
                medicalRecordId, "MEDICAL_RECORD_CONFIRMED", "SUCCESS", null);
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

    /** Preserve IDs and uploaded photos across repeated DRAFT saves. */
    private void updateClinicalExams(MedicalRecord record, List<MedicalClinicalExamRequest> requests) {
        if (requests == null) requests = List.of();
        Map<String, MedicalClinicalExam> existing = new HashMap<>();
        for (MedicalClinicalExam exam : medicalClinicalExamRepository
                .findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId())) {
            existing.put(exam.getExaminationArea(), exam);
        }
        Set<String> retained = new HashSet<>();
        for (MedicalClinicalExamRequest request : requests) {
            if (request == null || isBlank(request.getExaminationArea())
                    || isBlank(request.getConditionStatus())) continue;
            String area = normalize(request.getExaminationArea());
            if (!retained.add(area)) throw new BusinessRuleException("Duplicate clinical examination area: " + area);
            MedicalClinicalExam exam = existing.get(area);
            if (exam == null) {
                exam = new MedicalClinicalExam();
                exam.setClinicalExamId(idAllocator.next("CLN"));
                exam.setMedicalRecord(record);
                exam.setExaminationArea(area);
            }
            exam.setConditionStatus(normalize(request.getConditionStatus()));
            exam.setNotes(trimToNull(request.getNotes()));
            if ("NORMAL".equals(exam.getConditionStatus())) {
                removeEvidence(exam);
            }
            medicalClinicalExamRepository.save(exam);
        }
        for (var entry : existing.entrySet()) {
            if (!retained.contains(entry.getKey())) {
                removeEvidence(entry.getValue());
                medicalClinicalExamRepository.delete(entry.getValue());
            }
        }
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

    private void applyDraftConclusionPolicy(MedicalRecord record) {
        if ("INITIAL".equalsIgnoreCase(record.getExamType())) {
            record.setFinalConclusion(record.getSuggestedConclusion());
            record.setOverrideReason(null);
        }
    }

    private String safeSummary(String message) {
        String note = message == null || message.isBlank()
                ? "System medical evaluation requires training restriction" : message;
        return note.length() > 1000 ? note.substring(0, 1000) : note;
    }

    @Transactional
    public MedicalRecordResponse uploadClinicalEvidence(String recordId, String vetId,
                                                        String area, MultipartFile file) {
        MedicalRecord record = requireOwnedDraft(recordId, vetId);
        MedicalClinicalExam exam = requireClinicalArea(recordId, area);
        if ("NORMAL".equalsIgnoreCase(exam.getConditionStatus())) {
            throw new BusinessRuleException("Evidence images are only for ABNORMAL or CRITICAL findings");
        }
        if (storage == null) throw new BusinessRuleException("Medical image storage is not configured");
        var upload = storage.validate(file, false);
        exam.setEvidenceImagePath(storage.replace(StorageService.IMAGES, upload, exam.getEvidenceImagePath()));
        medicalClinicalExamRepository.save(exam);
        return buildResponse(record);
    }

    @Transactional
    public MedicalRecordResponse deleteClinicalEvidence(String recordId, String vetId, String area) {
        MedicalRecord record = requireOwnedDraft(recordId, vetId);
        removeEvidence(requireClinicalArea(recordId, area));
        return buildResponse(record);
    }

    private MedicalClinicalExam requireClinicalArea(String recordId, String area) {
        String wanted = normalize(area);
        if (wanted == null || !Set.of("EYES", "NOSE", "MOUTH", "MOVEMENT_LEGS").contains(wanted)) {
            throw new BusinessRuleException("Unknown clinical examination area");
        }
        return medicalClinicalExamRepository.findByMedicalRecord_MedicalRecordId(recordId)
                .stream().filter(e -> wanted.equals(e.getExaminationArea())).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Clinical examination area not found"));
    }

    private void removeEvidence(MedicalClinicalExam exam) {
        if (exam.getEvidenceImagePath() != null && storage != null) {
            storage.deleteOnCommit(StorageService.IMAGES, exam.getEvidenceImagePath());
        }
        exam.setEvidenceImagePath(null);
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

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
