package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.TrainingAssessmentReviewStatus;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.entity.TrainingSessionAssessment;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrainingAssessmentMedicalBridgeTest {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Bangkok");
    private static final ZoneId SERVER_ZONE = ZoneId.of("UTC");
    private final LocalDateTime assessedAt = LocalDateTime.of(2026, 11, 9, 10, 0);
    private final Clock clock = Clock.fixed(assessedAt.plusHours(1).atZone(BUSINESS_ZONE).toInstant(), BUSINESS_ZONE);
    private final TrainingSessionAssessmentRepository assessments = mock(TrainingSessionAssessmentRepository.class);
    private final HorseRepository horses = mock(HorseRepository.class);
    private final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
    private final TrainingAssessmentAccessService access = mock(TrainingAssessmentAccessService.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final TrainingAssessmentMedicalBridge bridge = new TrainingAssessmentMedicalBridge(
            assessments, horses, records, access, audit, clock, SERVER_ZONE);
    private Horse horse;
    private User vet;
    private MedicalRecord record;
    private TrainingSessionAssessment assessment;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(bridge, "entityManager", entityManager);
        horse = new Horse();
        horse.setHorseId("HOR-A");
        vet = user("VET-1");
        record = record("MED-1", "DRAFT");
        TrainingSession session = new TrainingSession();
        session.setSessionId("SES-1");
        session.setHorse(horse);
        session.setStatus("COMPLETED");
        assessment = new TrainingSessionAssessment();
        assessment.setSession(session);
        assessment.setAssessedAt(assessedAt);
        assessment.setReviewStatus(TrainingAssessmentReviewStatus.PENDING);
        when(horses.findByIdForUpdate("HOR-A")).thenReturn(Optional.of(horse));
        when(assessments.findByIdForUpdate("SES-1")).thenReturn(Optional.of(assessment));
        when(access.actor()).thenReturn(new AuthenticatedUser("VET-1", "vet@example.invalid", "ACTIVE", 3, "VETERINARIAN"));
        when(access.currentVet("HOR-A", true)).thenReturn(Optional.of(vet));
    }

    @Test
    void bridgeRequiresExistingTransaction() {
        Transactional annotation = TrainingAssessmentMedicalBridge.class.getAnnotation(Transactional.class);
        assertNotNull(annotation);
        assertEquals(Propagation.MANDATORY, annotation.propagation());
    }

    @Test
    void noSessionContextKeepsExistingMedicalBehavior() {
        bridge.prepareDraft("HOR-A", null, null);
        bridge.bindDraft(record, null);
        verifyNoInteractions(horses, assessments, entityManager, access, audit, records);
    }

    @Test
    void prepareDraftAcquiresHorseThenAssessmentBeforeAnyRecordIsInserted() {
        bridge.prepareDraft("HOR-A", "SES-1", assessedAt.plusMinutes(5));
        InOrder order = inOrder(horses, assessments, entityManager);
        order.verify(horses).findByIdForUpdate("HOR-A");
        order.verify(assessments).findByIdForUpdate("SES-1");
        order.verify(entityManager).refresh(assessment);
        verifyNoInteractions(records, audit);
        assertNull(assessment.getLinkedMedicalRecord());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
    }

    @Test
    void prepareDraftRejectsMissingExaminationTime() {
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED",
                () -> bridge.prepareDraft("HOR-A", "SES-1", null));
    }

    @Test
    void prepareDraftRejectsOldExaminationTime() {
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED",
                () -> bridge.prepareDraft("HOR-A", "SES-1", assessedAt.minusSeconds(1)));
    }

    @Test
    void prepareDraftRequiresCurrentAcceptedVet() {
        when(access.currentVet("HOR-A", true)).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class,
                () -> bridge.prepareDraft("HOR-A", "SES-1", assessedAt.plusMinutes(5)));
    }

    @Test
    void prepareDraftRejectsDifferentHorse() {
        assessment.getSession().setHorse(otherHorse());
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_HORSE_MISMATCH",
                () -> bridge.prepareDraft("HOR-A", "SES-1", assessedAt.plusMinutes(5)));
    }

    @Test
    void prepareDraftRejectsExistingActiveDraftBeforeInsert() {
        assessment.setLinkedMedicalRecord(record);
        when(records.findById("MED-1")).thenReturn(Optional.of(record));
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED",
                () -> bridge.prepareDraft("HOR-A", "SES-1", assessedAt.plusMinutes(5)));
    }

    @Test
    void prepareDraftAllowsCancelledDraftReplacementWithoutResolvingReview() {
        MedicalRecord cancelled = record("MED-OLD", "CANCELLED");
        assessment.setLinkedMedicalRecord(cancelled);
        when(records.findById("MED-OLD")).thenReturn(Optional.of(cancelled));
        bridge.prepareDraft("HOR-A", "SES-1", assessedAt.plusMinutes(5));
        assertSame(cancelled, assessment.getLinkedMedicalRecord());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
    }

    @Test
    void blankContextIsRejected() {
        assertError(HttpStatus.BAD_REQUEST, "ASSESSMENT_REQUIRED", () -> bridge.bindDraft(record, " "));
    }

    @Test
    void recordMustBeSavedBeforeBinding() {
        record.setMedicalRecordId(null);
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void bindingLocksHorseBeforeAssessmentAndDoesNotRefreshNewRecord() {
        bridge.bindDraft(record, "SES-1");
        InOrder order = inOrder(horses, assessments, entityManager);
        order.verify(horses).findByIdForUpdate("HOR-A");
        order.verify(assessments).findByIdForUpdate("SES-1");
        order.verify(entityManager).refresh(assessment);
        assertSame(record, assessment.getLinkedMedicalRecord());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
        verify(entityManager, never()).refresh(record);
        verify(assessments).save(assessment);
        verify(audit).record(eq("VET-1"), eq("HOR-A"), eq("TRAINING_SESSION_ASSESSMENT"), eq("SES-1"),
                eq("TRAINING_ASSESSMENT_MEDICAL_LINKED"), eq("SUCCESS"), contains("MED-1"));
    }

    @Test
    void normalDraftLinkNeverCreatesPendingReview() {
        assessment.setReviewStatus(TrainingAssessmentReviewStatus.NOT_REQUIRED);
        bridge.bindDraft(record, "SES-1");
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
    }

    @Test
    void identicalDraftBindingIsIdempotent() {
        assessment.setLinkedMedicalRecord(record);
        bridge.bindDraft(record, "SES-1");
        verify(assessments, never()).save(any());
        verifyNoInteractions(audit);
    }

    @Test
    void recordAlreadyLinkedToAnotherSessionIsRejected() {
        when(assessments.existsByLinkedMedicalRecordIdAndSessionIdNot("MED-1", "SES-1")).thenReturn(true);
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
        assertNull(assessment.getLinkedMedicalRecord());
    }

    @Test
    void anotherActiveDraftCannotBeReplaced() {
        MedicalRecord previous = record("MED-OLD", "DRAFT");
        assessment.setLinkedMedicalRecord(previous);
        when(records.findById("MED-OLD")).thenReturn(Optional.of(previous));
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
        assertSame(previous, assessment.getLinkedMedicalRecord());
    }

    @Test
    void cancelledDraftCanBeReplacedWithAuditableLink() {
        MedicalRecord cancelled = record("MED-OLD", "CANCELLED");
        assessment.setLinkedMedicalRecord(cancelled);
        when(records.findById("MED-OLD")).thenReturn(Optional.of(cancelled));
        bridge.bindDraft(record, "SES-1");
        assertSame(record, assessment.getLinkedMedicalRecord());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
        verify(audit).record(eq("VET-1"), eq("HOR-A"), eq("TRAINING_SESSION_ASSESSMENT"), eq("SES-1"),
                eq("TRAINING_ASSESSMENT_MEDICAL_RELINKED"), eq("SUCCESS"),
                eq("Replaced cancelled examination MED-OLD with MED-1"));
    }

    @Test
    void missingPreviousRecordDoesNotAllowSilentReplacement() {
        assessment.setLinkedMedicalRecord(record("MED-OLD", "CANCELLED"));
        when(records.findById("MED-OLD")).thenReturn(Optional.empty());
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void alreadyReviewedAssessmentCannotBeRelinked() {
        assessment.setReviewStatus(TrainingAssessmentReviewStatus.RESOLVED);
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CONFIRMED", "CANCELLED"})
    void bindingRequiresDraftStatus(String status) {
        record.setStatus(status);
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void t27BindingRequiresSameHorse() {
        assessment.getSession().setHorse(otherHorse());
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_HORSE_MISMATCH", () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void sessionMustActuallyBeCompleted() {
        assessment.getSession().setStatus("SCHEDULED");
        assertError(HttpStatus.CONFLICT, "INVALID_SESSION_STATE", () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void t27OldServerCreatedRecordCannotBeAttached() {
        record.setCreatedAt(serverTime(assessedAt.minusSeconds(1)));
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void t27ExaminationPerformedBeforeAssessmentCannotBeAttached() {
        record.setExaminedAt(assessedAt.minusSeconds(1));
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void missingTimestampCannotBypassChronology() {
        record.setCreatedAt(null);
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void wrongActorCannotBindAnotherVetsExamination() {
        when(access.actor()).thenReturn(new AuthenticatedUser("VET-2", "other@example.invalid", "ACTIVE", 3, "VETERINARIAN"));
        assertThrows(AccessDeniedException.class, () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void t23AssignedButNotAcceptedVetCannotBind() {
        when(access.currentVet("HOR-A", true)).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void t22OldVetCannotBindAfterAssignmentReplacement() {
        User newVet = user("VET-2");
        when(access.currentVet("HOR-A", true)).thenReturn(Optional.of(newVet));
        assertThrows(AccessDeniedException.class, () -> bridge.bindDraft(record, "SES-1"));
    }

    @Test
    void unrelatedMedicalConfirmDoesNotLockOrResolveAssessment() {
        bridge.beforeConfirmation(record);
        bridge.onConfirmed(record);
        verify(assessments, times(2)).findByLinkedMedicalRecordId("MED-1");
        verify(assessments, never()).save(any());
        verifyNoInteractions(horses, entityManager, access, audit);
    }

    @Test
    void t26BeforeConfirmationRefreshesDraftUnderHorseAndAssessmentLocks() {
        link();
        bridge.beforeConfirmation(record);
        InOrder order = inOrder(horses, assessments, entityManager);
        order.verify(assessments).findByLinkedMedicalRecordId("MED-1");
        order.verify(horses).findByIdForUpdate("HOR-A");
        order.verify(assessments).findByIdForUpdate("SES-1");
        order.verify(entityManager).refresh(assessment);
        order.verify(entityManager).refresh(record);
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
        verify(assessments, never()).save(any());
    }

    @Test
    void cancelledDraftDetectedAfterRefreshCannotBeConfirmed() {
        link();
        doAnswer(invocation -> { record.setStatus("CANCELLED"); return null; }).when(entityManager).refresh(record);
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", () -> bridge.beforeConfirmation(record));
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
    }

    @Test
    void changedLinkAfterHorseLockCannotResolvePreviousRecord() {
        link();
        MedicalRecord replacement = record("MED-NEW", "DRAFT");
        doAnswer(invocation -> { assessment.setLinkedMedicalRecord(replacement); return null; })
                .when(entityManager).refresh(assessment);
        confirm("FIT");
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.onConfirmed(record));
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
    }

    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "CANCELLED"})
    void t26AndT27UnconfirmedRecordsNeverResolve(String status) {
        link();
        record.setStatus(status);
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", () -> bridge.onConfirmed(record));
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
        verify(assessments, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"FIT", "FIT_WITH_MONITORING", "NOT_FIT"})
    void t28AndT29ConfirmedLinkedDecisionResolvesOnlyItsAssessment(String conclusion) {
        link();
        confirm(conclusion);
        horse.setTrainingLocked(true);
        bridge.onConfirmed(record);
        assertEquals(TrainingAssessmentReviewStatus.RESOLVED, assessment.getReviewStatus());
        assertSame(record, assessment.getReviewedMedicalRecord());
        assertSame(vet, assessment.getReviewedBy());
        assertEquals(assessedAt.plusMinutes(10), assessment.getResolvedAt());
        assertTrue(horse.getTrainingLocked());
        verify(entityManager, never()).refresh(record);
        verify(assessments).save(assessment);
        verify(audit).record(eq("VET-1"), eq("HOR-A"), eq("TRAINING_SESSION_ASSESSMENT"), eq("SES-1"),
                eq("TRAINING_ASSESSMENT_REVIEW_RESOLVED"), eq("SUCCESS"), contains(conclusion));
    }

    @Test
    void serverTimesAreConvertedWithoutChangingMedicalTimestamps() {
        LocalDateTime originalCreatedAt = record.getCreatedAt();
        assertTrue(originalCreatedAt.isBefore(assessedAt)); // 03:02 UTC is 10:02 Bangkok.
        bridge.bindDraft(record, "SES-1");
        link();
        confirm("FIT");
        LocalDateTime originalConfirmedAt = record.getConfirmedAt();
        assertTrue(originalConfirmedAt.isBefore(assessedAt));
        bridge.onConfirmed(record);
        assertEquals(originalCreatedAt, record.getCreatedAt());
        assertEquals(originalConfirmedAt, record.getConfirmedAt());
        assertEquals(assessedAt.plusMinutes(10), assessment.getResolvedAt());
    }

    @Test
    void normalManualCheckRemainsNotRequiredAfterConfirmation() {
        link();
        assessment.setReviewStatus(TrainingAssessmentReviewStatus.NOT_REQUIRED);
        confirm("FIT");
        bridge.onConfirmed(record);
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
        assertSame(record, assessment.getReviewedMedicalRecord());
        verify(audit).record(eq("VET-1"), eq("HOR-A"), eq("TRAINING_SESSION_ASSESSMENT"), eq("SES-1"),
                eq("TRAINING_ASSESSMENT_VET_CHECK_RECORDED"), eq("SUCCESS"), anyString());
    }

    @Test
    void confirmationRetryDoesNotCreateDuplicateReviewOrAudit() {
        link();
        confirm("FIT");
        bridge.onConfirmed(record);
        bridge.onConfirmed(record);
        verify(assessments, times(1)).save(assessment);
        verify(audit, times(1)).record(any(), any(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void t30OnlyExplicitlyLinkedAssessmentIsResolved() {
        link();
        confirm("FIT");
        TrainingSessionAssessment other = new TrainingSessionAssessment();
        other.setReviewStatus(TrainingAssessmentReviewStatus.PENDING);
        bridge.onConfirmed(record);
        assertEquals(TrainingAssessmentReviewStatus.RESOLVED, assessment.getReviewStatus());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, other.getReviewStatus());
        verify(assessments, never()).findByHorseIdAndReviewStatus(anyString(), any());
    }

    @Test
    void confirmedRecordMustStillHaveValidFinalDecision() {
        link();
        confirm("UNKNOWN");
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", () -> bridge.onConfirmed(record));
    }

    @Test
    void confirmedTimestampIsRequired() {
        link();
        confirm("FIT");
        record.setConfirmedAt(null);
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", () -> bridge.onConfirmed(record));
    }

    @Test
    void confirmationCannotPrecedeExamination() {
        link();
        confirm("FIT");
        record.setConfirmedAt(serverTime(record.getExaminedAt().minusSeconds(1)));
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_CONFIRMED", () -> bridge.onConfirmed(record));
    }

    @Test
    void t27HorseMismatchAtConfirmationCannotResolvePendingReview() {
        link();
        confirm("FIT");
        record.getHealthProfile().setHorse(otherHorse());
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_HORSE_MISMATCH", () -> bridge.onConfirmed(record));
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
    }

    @Test
    void oldVetCannotConfirmAfterCurrentVetChanges() {
        link();
        confirm("FIT");
        User newVet = user("VET-2");
        when(access.currentVet("HOR-A", true)).thenReturn(Optional.of(newVet));
        assertThrows(AccessDeniedException.class, () -> bridge.onConfirmed(record));
    }

    @Test
    void beforeConfirmationAlsoRechecksCurrentAssignment() {
        link();
        when(access.currentVet("HOR-A", true)).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, () -> bridge.beforeConfirmation(record));
    }

    @Test
    void auditFailurePropagatesToOuterMedicalTransaction() {
        link();
        confirm("FIT");
        IllegalStateException failure = new IllegalStateException("Audit save failed");
        doThrow(failure).when(audit).record(any(), any(), anyString(), any(), anyString(), anyString(), anyString());
        assertSame(failure, assertThrows(IllegalStateException.class, () -> bridge.onConfirmed(record)));
        // Exception propagation is tested; actual database rollback remains deferred.
    }

    @Test
    void missingAssessmentIsNotFabricated() {
        when(assessments.findByIdForUpdate("SES-1")).thenReturn(Optional.empty());
        assertError(HttpStatus.NOT_FOUND, "ASSESSMENT_NOT_FOUND", () -> bridge.bindDraft(record, "SES-1"));
        verify(assessments, never()).save(any());
    }

    @Test
    void previouslyReviewedNormalCannotAttachAnotherExamination() {
        assessment.setReviewStatus(TrainingAssessmentReviewStatus.NOT_REQUIRED);
        assessment.setReviewedMedicalRecord(record("MED-OLD", "CONFIRMED"));
        assertError(HttpStatus.CONFLICT, "MEDICAL_RECORD_NOT_LINKED", () -> bridge.bindDraft(record, "SES-1"));
    }

    private void link() {
        assessment.setLinkedMedicalRecord(record);
        when(assessments.findByLinkedMedicalRecordId("MED-1")).thenReturn(Optional.of(assessment));
    }

    private void confirm(String conclusion) {
        record.setStatus("CONFIRMED");
        record.setFinalConclusion(conclusion);
        record.setConfirmedAt(serverTime(assessedAt.plusMinutes(10)));
    }

    private LocalDateTime serverTime(LocalDateTime businessTime) {
        return businessTime.atZone(BUSINESS_ZONE).withZoneSameInstant(SERVER_ZONE).toLocalDateTime();
    }

    private User user(String id) {
        Role role = new Role();
        role.setRoleName("VETERINARIAN");
        User result = new User();
        result.setUserId(id);
        result.setRole(role);
        result.setStatus("ACTIVE");
        return result;
    }

    private Horse otherHorse() {
        Horse other = new Horse();
        other.setHorseId("HOR-OTHER");
        return other;
    }

    private MedicalRecord record(String id, String status) {
        MedicalRecord result = new MedicalRecord();
        result.setMedicalRecordId(id);
        result.setStatus(status);
        result.setVeterinarian(vet);
        HealthProfile profile = new HealthProfile();
        profile.setProfileId("PROF-1");
        profile.setHorse(horse);
        result.setHealthProfile(profile);
        result.setCreatedAt(serverTime(assessedAt.plusMinutes(2)));
        result.setExaminedAt(assessedAt.plusMinutes(5));
        return result;
    }

    private void assertError(HttpStatus status, String code, Runnable operation) {
        ApiException error = assertThrows(ApiException.class, operation::run);
        assertEquals(status, error.getStatus());
        assertEquals(code, error.getCode());
    }
}