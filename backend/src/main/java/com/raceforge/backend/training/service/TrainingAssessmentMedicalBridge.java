package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.TrainingAssessmentReviewStatus;
import com.raceforge.backend.training.entity.TrainingSessionAssessment;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/** Training owns session/examination linkage; Medical continues to own its decisions and locks. */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class TrainingAssessmentMedicalBridge {
    private static final Set<String> FINAL_CONCLUSIONS = Set.of("FIT", "FIT_WITH_MONITORING", "NOT_FIT");

    private final TrainingSessionAssessmentRepository assessments;
    private final HorseRepository horses;
    private final MedicalRecordRepository medicalRecords;
    private final TrainingAssessmentAccessService access;
    private final AuditLogService audit;
    private final Clock clock;
    private final ZoneId medicalServerZone;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    public TrainingAssessmentMedicalBridge(TrainingSessionAssessmentRepository assessments,
                                           HorseRepository horses,
                                           MedicalRecordRepository medicalRecords,
                                           TrainingAssessmentAccessService access,
                                           AuditLogService audit,
                                           @Qualifier("trainingClock") Clock clock) {
        this(assessments, horses, medicalRecords, access, audit, clock, ZoneId.systemDefault());
    }

    // Explicit source zone makes timestamp compatibility testable without changing JVM globals.
    TrainingAssessmentMedicalBridge(TrainingSessionAssessmentRepository assessments,
                                     HorseRepository horses,
                                     MedicalRecordRepository medicalRecords,
                                     TrainingAssessmentAccessService access,
                                     AuditLogService audit,
                                     Clock clock,
                                     ZoneId medicalServerZone) {
        this.assessments = assessments;
        this.horses = horses;
        this.medicalRecords = medicalRecords;
        this.access = access;
        this.audit = audit;
        this.clock = clock;
        this.medicalServerZone = medicalServerZone;
    }

    /** Acquire horse -> assessment before Medical allocates or inserts the new examination. */
    public void prepareDraft(String horseId, String sessionId, LocalDateTime examinedAt) {
        if (sessionId == null) {
            return;
        }
        requireSessionId(sessionId);
        lockHorse(horseId);
        TrainingSessionAssessment assessment = lockAssessment(sessionId);
        requireSessionContext(assessment, horseId);
        requireAcceptedVeterinarian(horseId);
        requireNotAlreadyReviewed(assessment);
        if (examinedAt == null || assessment.getAssessedAt() == null
                || examinedAt.isBefore(assessment.getAssessedAt())
                || LocalDateTime.now(clock).isBefore(assessment.getAssessedAt())) {
            throw notLinked("Use an examination performed after this post-training assessment.");
        }
        requireReplaceableLink(assessment);
    }
    /** Called with the managed newly saved DRAFT, inside Medical's existing transaction. */
    public void bindDraft(MedicalRecord record, String sessionId) {
        if (sessionId == null) {
            return; // Existing Medical creation without a post-training context is unchanged.
        }
        requireSessionId(sessionId);
        requireRecordId(record);
        String horseId = horseId(record);
        lockHorse(horseId);
        TrainingSessionAssessment assessment = lockAssessment(sessionId);
        requireDraft(record);
        requireContext(assessment, record);
        requireCurrentVeterinarian(record, horseId);
        requireNotAlreadyReviewed(assessment);
        if (assessments.existsByLinkedMedicalRecordIdAndSessionIdNot(record.getMedicalRecordId(), sessionId)) {
            throw notLinked("This examination is already linked to a different training session.");
        }
        if (record.getMedicalRecordId().equals(assessment.getLinkedMedicalRecordId())) {
            return; // Retry of the same binding creates no additional audit or writes.
        }

        String previousRecordId = requireReplaceableLink(assessment);
        assessment.setLinkedMedicalRecord(record);
        assessments.save(assessment);
        audit.record(record.getVeterinarian().getUserId(), horseId, "TRAINING_SESSION_ASSESSMENT", sessionId,
                previousRecordId == null ? "TRAINING_ASSESSMENT_MEDICAL_LINKED" : "TRAINING_ASSESSMENT_MEDICAL_RELINKED",
                "SUCCESS", previousRecordId == null ? "Linked examination " + record.getMedicalRecordId()
                        : "Replaced cancelled examination " + previousRecordId + " with " + record.getMedicalRecordId());
    }

    /**
     * Called before Medical changes DRAFT to CONFIRMED. Lock the horse first, then
     * refresh the linked draft so a concurrent reassignment/cancellation is not lost.
     */
    public void beforeConfirmation(MedicalRecord record) {
        Optional<TrainingSessionAssessment> linked = lockedLinkedAssessment(record);
        if (linked.isEmpty()) {
            return;
        }
        entityManager.refresh(record);
        TrainingSessionAssessment assessment = linked.get();
        requireDraft(record);
        requireContext(assessment, record);
        requireCurrentVeterinarian(record, assessment.getHorseId());
        requireNotAlreadyReviewed(assessment);
    }

    /** Called after Medical writes its final decision; never refresh that newly changed record here. */
    public void onConfirmed(MedicalRecord record) {
        Optional<TrainingSessionAssessment> linked = lockedLinkedAssessment(record);
        if (linked.isEmpty()) {
            return; // An unrelated examination must never clear pending assessments by horse.
        }
        TrainingSessionAssessment assessment = linked.get();
        if (!"CONFIRMED".equals(record.getStatus())) {
            throw error(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", "Confirm the linked examination before completing its review.");
        }
        requireContext(assessment, record);
        User veterinarian = requireCurrentVeterinarian(record, assessment.getHorseId());
        if (record.getFinalConclusion() == null || !FINAL_CONCLUSIONS.contains(record.getFinalConclusion())
                || record.getConfirmedAt() == null || medicalBusinessTime(record.getConfirmedAt()).isBefore(assessment.getAssessedAt())
                || record.getConfirmedAt().isBefore(record.getCreatedAt())
                || medicalBusinessTime(record.getConfirmedAt()).isBefore(record.getExaminedAt())) {
            throw error(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", "A valid confirmed veterinary decision is required.");
        }

        if (record.getMedicalRecordId().equals(assessment.getReviewedMedicalRecordId())
                && assessment.getReviewStatus() != TrainingAssessmentReviewStatus.PENDING
                && assessment.getResolvedAt() != null) {
            return; // Confirmation retry is idempotent.
        }
        requireNotAlreadyReviewed(assessment);
        boolean wasPending = assessment.getReviewStatus() == TrainingAssessmentReviewStatus.PENDING;
        if (wasPending) {
            assessment.setReviewStatus(TrainingAssessmentReviewStatus.RESOLVED);
        } else if (assessment.getReviewStatus() != TrainingAssessmentReviewStatus.NOT_REQUIRED) {
            throw notLinked("This assessment cannot be resolved by the selected examination.");
        }
        assessment.setReviewedMedicalRecord(record);
        assessment.setReviewedBy(veterinarian);
        assessment.setResolvedAt(medicalBusinessTime(record.getConfirmedAt()));
        assessments.save(assessment);
        audit.record(veterinarian.getUserId(), assessment.getHorseId(), "TRAINING_SESSION_ASSESSMENT",
                assessment.getSessionId(), wasPending ? "TRAINING_ASSESSMENT_REVIEW_RESOLVED" : "TRAINING_ASSESSMENT_VET_CHECK_RECORDED",
                "SUCCESS", "Confirmed examination " + record.getMedicalRecordId() + ": " + record.getFinalConclusion());
        // No package, schedule, horse health or Training_Lock mutation belongs here.
    }

    private Optional<TrainingSessionAssessment> lockedLinkedAssessment(MedicalRecord record) {
        if (record == null || record.getMedicalRecordId() == null) {
            return Optional.empty();
        }
        Optional<TrainingSessionAssessment> existing = assessments.findByLinkedMedicalRecordId(record.getMedicalRecordId());
        if (existing.isEmpty()) {
            return Optional.empty();
        }
        TrainingSessionAssessment observed = existing.get();
        lockHorse(observed.getHorseId());
        TrainingSessionAssessment assessment = lockAssessment(observed.getSessionId());
        if (!record.getMedicalRecordId().equals(assessment.getLinkedMedicalRecordId())) {
            throw notLinked("This examination is no longer linked to this training session.");
        }
        return Optional.of(assessment);
    }

    private void lockHorse(String horseId) {
        if (horseId == null) {
            throw error(HttpStatus.CONFLICT, "MEDICAL_RECORD_HORSE_MISMATCH", "The examination must belong to this horse.");
        }
        horses.findByIdForUpdate(horseId).orElseThrow(() ->
                error(HttpStatus.NOT_FOUND, "HORSE_NOT_FOUND", "Horse not found."));
    }

    private TrainingSessionAssessment lockAssessment(String sessionId) {
        TrainingSessionAssessment assessment = assessments.findByIdForUpdate(sessionId).orElseThrow(() ->
                error(HttpStatus.NOT_FOUND, "ASSESSMENT_NOT_FOUND", "No post-training assessment was found for this session."));
        entityManager.refresh(assessment);
        return assessment;
    }

    private void requireContext(TrainingSessionAssessment assessment, MedicalRecord record) {
        requireSessionContext(assessment, horseId(record));
        if (assessment.getAssessedAt() == null || record.getCreatedAt() == null || record.getExaminedAt() == null
                || medicalBusinessTime(record.getCreatedAt()).isBefore(assessment.getAssessedAt())
                || record.getExaminedAt().isBefore(assessment.getAssessedAt())) {
            throw notLinked("Use an examination created and performed after this post-training assessment.");
        }
    }

    private void requireSessionContext(TrainingSessionAssessment assessment, String horseId) {
        if (!Objects.equals(assessment.getHorseId(), horseId)) {
            throw error(HttpStatus.CONFLICT, "MEDICAL_RECORD_HORSE_MISMATCH", "The examination must belong to the same horse as the training session.");
        }
        if (assessment.getSession() == null || !"COMPLETED".equals(assessment.getSession().getStatus())) {
            throw error(HttpStatus.CONFLICT, "INVALID_SESSION_STATE", "A completed training session is required for this assessment.");
        }
    }

    private User requireCurrentVeterinarian(MedicalRecord record, String horseId) {
        User current = requireAcceptedVeterinarian(horseId);
        if (record.getVeterinarian() == null
                || !current.getUserId().equals(record.getVeterinarian().getUserId())) {
            throw new AccessDeniedException("Only the current assigned veterinarian may review this assessment.");
        }
        return current;
    }

    private User requireAcceptedVeterinarian(String horseId) {
        AuthenticatedUser actor = access.actor();
        if (actor == null || !"ACTIVE".equals(actor.status()) || !"VETERINARIAN".equals(actor.roleName())
                || actor.userId() == null) {
            throw new AccessDeniedException("Only the current assigned veterinarian may review this assessment.");
        }
        User current = access.currentVet(horseId, true).orElseThrow(() ->
                new AccessDeniedException("Accept the current care assignment before reviewing this horse."));
        if (!actor.userId().equals(current.getUserId())) {
            throw new AccessDeniedException("This horse is assigned to another veterinarian.");
        }
        return current;
    }

    private String requireReplaceableLink(TrainingSessionAssessment assessment) {
        String previousRecordId = assessment.getLinkedMedicalRecordId();
        if (previousRecordId != null) {
            MedicalRecord previous = medicalRecords.findById(previousRecordId)
                    .orElseThrow(() -> notLinked("The previous linked examination could not be verified."));
            if (!"CANCELLED".equals(previous.getStatus())) {
                throw notLinked("Finish or cancel the linked examination before attaching another one.");
            }
        }
        return previousRecordId;
    }

    /** Medical server-generated timestamps use the host zone; explicit examination input is club wall time. */
    private LocalDateTime medicalBusinessTime(LocalDateTime serverTime) {
        return serverTime.atZone(medicalServerZone).withZoneSameInstant(clock.getZone()).toLocalDateTime();
    }

    private void requireSessionId(String sessionId) {
        if (sessionId.isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "ASSESSMENT_REQUIRED", "Choose a valid post-training assessment.");
        }
    }
    private void requireDraft(MedicalRecord record) {
        if (!"DRAFT".equals(record.getStatus())) {
            throw error(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", "Only an active draft examination can be linked or confirmed.");
        }
    }

    private void requireNotAlreadyReviewed(TrainingSessionAssessment assessment) {
        if (assessment.getReviewStatus() == TrainingAssessmentReviewStatus.RESOLVED
                || assessment.getReviewedMedicalRecordId() != null) {
            throw notLinked("A veterinary review has already been recorded for this assessment.");
        }
    }

    private void requireRecordId(MedicalRecord record) {
        if (record == null || record.getMedicalRecordId() == null || record.getMedicalRecordId().isBlank()) {
            throw notLinked("Save the examination before linking it to the training session.");
        }
    }

    private String horseId(MedicalRecord record) {
        return record == null || record.getHealthProfile() == null || record.getHealthProfile().getHorse() == null
                ? null : record.getHealthProfile().getHorse().getHorseId();
    }

    private ApiException notLinked(String message) {
        return error(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", message);
    }

    private ApiException error(HttpStatus status, String code, String message) {
        return new ApiException(status, code, message);
    }
}