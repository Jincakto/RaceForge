package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseAssignment;
import com.raceforge.backend.horse.repository.HorseAssignmentRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.horse.service.ModuleIdAllocator;
import com.raceforge.backend.medical.dto.MedicalRecordCreateRequest;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.mapper.MedicalRecordMapper;
import com.raceforge.backend.medical.repository.*;
import com.raceforge.backend.medical.service.MedicalAssignmentService;
import com.raceforge.backend.medical.service.MedicalEvaluationResult;
import com.raceforge.backend.medical.service.MedicalEvaluationService;
import com.raceforge.backend.medical.service.MedicalRecordService;
import com.raceforge.backend.medical.service.TrainingLockService;
import com.raceforge.backend.notification.service.NotificationService;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Actual Medical service wiring with a mock Training bridge/notifier.
 * Failure propagation and order are checked; database rollback/races remain deferred.
 */
class TrainingAssessmentMedicalHooksTest {
    private static final String HORSE_ID = "HOR-000001";
    private static final String VET_ID = "VET-000001";
    private static final String MANAGER_ID = "CM-000001";
    private static final String PROFILE_ID = "HLT-000001";
    private static final String RECORD_ID = "MED-000001";
    private static final String SESSION_ID = "SES-000001";
    private static final String ASSIGNMENT_ID = "ASN-000001";
    private static final LocalDateTime EXAMINED_AT = LocalDateTime.of(2026, 11, 10, 11, 0);

    @Test
    void linkedCreationPreparesBeforeWritesAndBindsManagedDraftAfterSave() {
        RecordFixture fixture = new RecordFixture();
        MedicalRecordCreateRequest request = fixture.request(SESSION_ID);
        AtomicReference<MedicalRecord> saved = new AtomicReference<>();
        when(fixture.records.save(any())).thenAnswer(invocation -> {
            MedicalRecord managed = invocation.getArgument(0);
            saved.set(managed);
            return managed;
        });
        doAnswer(invocation -> {
            assertSame(saved.get(), invocation.getArgument(0));
            assertEquals("DRAFT", saved.get().getStatus());
            return null;
        }).when(fixture.bridge).bindDraft(any(), eq(SESSION_ID));

        fixture.service.createMedicalRecord(request);

        var order = inOrder(fixture.assignments, fixture.bridge, fixture.records, fixture.mapper);
        order.verify(fixture.assignments).requireAccepted(HORSE_ID, VET_ID);
        order.verify(fixture.bridge).prepareDraft(HORSE_ID, SESSION_ID, EXAMINED_AT);
        order.verify(fixture.records).save(any(MedicalRecord.class));
        order.verify(fixture.bridge).bindDraft(saved.get(), SESSION_ID);
        order.verify(fixture.mapper).toResponse(eq(saved.get()), any(), anyList());
        assertEquals(RECORD_ID, saved.get().getMedicalRecordId());
        assertEquals(EXAMINED_AT, saved.get().getExaminedAt());
        assertNull(saved.get().getTrainingEligible());
        verifyNoInteractions(fixture.locks);
    }

    @Test
    void preparationFailureStopsCreationBeforeIdAllocationOrPersistence() {
        RecordFixture fixture = new RecordFixture();
        RuntimeException failure = new RuntimeException("Context is not authorized");
        doThrow(failure).when(fixture.bridge).prepareDraft(HORSE_ID, SESSION_ID, EXAMINED_AT);

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> fixture.service.createMedicalRecord(fixture.request(SESSION_ID))));

        verifyNoInteractions(fixture.ids, fixture.records, fixture.locks, fixture.mapper);
        verify(fixture.bridge, never()).bindDraft(any(), any());
    }

    @Test
    void draftBindingFailureIsPropagatedInsteadOfReturningSuccess() {
        RecordFixture fixture = new RecordFixture();
        RuntimeException failure = new RuntimeException("Link persistence failed");
        doThrow(failure).when(fixture.bridge).bindDraft(any(), eq(SESSION_ID));

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> fixture.service.createMedicalRecord(fixture.request(SESSION_ID))));

        verify(fixture.records).save(any());
        verifyNoInteractions(fixture.mapper, fixture.locks);
        // A mock cannot prove the enclosing transaction rolled the saved draft back.
    }

    @Test
    void ordinaryDraftWithoutSessionContextKeepsOriginalMedicalBehavior() {
        RecordFixture fixture = new RecordFixture();
        AtomicReference<MedicalRecord> saved = new AtomicReference<>();
        when(fixture.records.save(any())).thenAnswer(invocation -> {
            saved.set(invocation.getArgument(0));
            return saved.get();
        });

        fixture.service.createMedicalRecord(fixture.request(null));

        assertEquals("DRAFT", saved.get().getStatus());
        assertEquals(RECORD_ID, saved.get().getMedicalRecordId());
        assertNull(saved.get().getTrainingEligible());
        verify(fixture.bridge).prepareDraft(HORSE_ID, null, EXAMINED_AT);
        verify(fixture.bridge).bindDraft(saved.get(), null);
        verify(fixture.bridge, never()).onConfirmed(any());
        verifyNoInteractions(fixture.locks);
    }

    @Test
    void failedMedicalAssignmentCheckDoesNotReachTrainingPreparation() {
        RecordFixture fixture = new RecordFixture();
        doThrow(new BusinessRuleException("Accept the current assignment first"))
                .when(fixture.assignments).requireAccepted(HORSE_ID, VET_ID);

        assertThrows(BusinessRuleException.class,
                () -> fixture.service.createMedicalRecord(fixture.request(SESSION_ID)));

        verifyNoInteractions(fixture.bridge, fixture.records, fixture.ids);
    }

    @Test
    void fitConfirmationChecksLinkBeforeMutationThenResolvesAfterMedicalSave() {
        RecordFixture fixture = new RecordFixture();
        MedicalRecord record = fixture.draft("FIT", MedicalEvaluationResult.EvaluationLevel.NORMAL);
        doAnswer(invocation -> {
            assertEquals("DRAFT", record.getStatus());
            assertNull(record.getConfirmedAt());
            return null;
        }).when(fixture.bridge).beforeConfirmation(record);
        doAnswer(invocation -> {
            assertEquals("CONFIRMED", record.getStatus());
            assertEquals("FIT", record.getFinalConclusion());
            assertEquals(Boolean.TRUE, record.getTrainingEligible());
            assertNotNull(record.getConfirmedAt());
            return null;
        }).when(fixture.bridge).onConfirmed(record);

        fixture.service.confirmMedicalRecord(RECORD_ID, VET_ID);

        var order = inOrder(fixture.bridge, fixture.records, fixture.mapper);
        order.verify(fixture.bridge).beforeConfirmation(record);
        order.verify(fixture.records).save(record);
        order.verify(fixture.bridge).onConfirmed(record);
        order.verify(fixture.mapper).toResponse(eq(record), any(), anyList());
        verifyNoInteractions(fixture.locks);
        assertEquals("READY", fixture.horse.getHealthStatus());
    }

    @Test
    void notFitCreatesExistingMedicalLockBeforeAssessmentResolution() {
        RecordFixture fixture = new RecordFixture();
        MedicalRecord record = fixture.draft("NOT_FIT", MedicalEvaluationResult.EvaluationLevel.CRITICAL);

        fixture.service.confirmMedicalRecord(RECORD_ID, VET_ID);

        var order = inOrder(fixture.bridge, fixture.records, fixture.locks);
        order.verify(fixture.bridge).beforeConfirmation(record);
        order.verify(fixture.records).save(record);
        order.verify(fixture.locks).lockFromConfirmedExamination(fixture.horse, record, fixture.vet,
                record.getTrainingLockReason());
        order.verify(fixture.bridge).onConfirmed(record);
        assertEquals("NOT_FIT", record.getFinalConclusion());
        assertEquals(Boolean.FALSE, record.getTrainingEligible());
        assertEquals("NOT_FIT", fixture.horse.getHealthStatus());
    }

    @Test
    void failedPreConfirmationLeavesDraftUntouchedAndSkipsMedicalWrites() {
        RecordFixture fixture = new RecordFixture();
        MedicalRecord record = fixture.draft("FIT", MedicalEvaluationResult.EvaluationLevel.NORMAL);
        RuntimeException failure = new RuntimeException("The linked assignment changed");
        doThrow(failure).when(fixture.bridge).beforeConfirmation(record);

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> fixture.service.confirmMedicalRecord(RECORD_ID, VET_ID)));

        assertEquals("DRAFT", record.getStatus());
        assertNull(record.getConfirmedAt());
        verify(fixture.records, never()).save(any());
        verify(fixture.bridge, never()).onConfirmed(any());
        verifyNoInteractions(fixture.evaluation, fixture.locks, fixture.mapper);
    }

    @Test
    void resolutionFailurePropagatesAfterMedicalDecisionRatherThanReturningSuccess() {
        RecordFixture fixture = new RecordFixture();
        MedicalRecord record = fixture.draft("NOT_FIT", MedicalEvaluationResult.EvaluationLevel.CRITICAL);
        RuntimeException failure = new RuntimeException("Review persistence failed");
        doThrow(failure).when(fixture.bridge).onConfirmed(record);

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> fixture.service.confirmMedicalRecord(RECORD_ID, VET_ID)));

        verify(fixture.records).save(record);
        verify(fixture.locks).lockFromConfirmedExamination(any(), eq(record), any(), anyString());
        verifyNoInteractions(fixture.mapper);
        // Database rollback of the medical decision and lock is not asserted with Mockito.
    }

    @Test
    void incompleteMedicalDataCannotResolveAssessment() {
        RecordFixture fixture = new RecordFixture();
        MedicalRecord record = fixture.draft("FIT", MedicalEvaluationResult.EvaluationLevel.INCOMPLETE);

        assertThrows(BusinessRuleException.class,
                () -> fixture.service.confirmMedicalRecord(RECORD_ID, VET_ID));

        assertEquals("DRAFT", record.getStatus());
        verify(fixture.bridge).beforeConfirmation(record);
        verify(fixture.bridge, never()).onConfirmed(any());
        verify(fixture.records, never()).save(any());
        verifyNoInteractions(fixture.locks);
    }

    @Test
    void assignmentCreationFlushesNewResponsibilityBeforeTrainingNotificationHook() {
        AssignmentFixture fixture = new AssignmentFixture();
        AtomicReference<HorseAssignment> saved = new AtomicReference<>();
        when(fixture.assignments.saveAndFlush(any())).thenAnswer(invocation -> {
            saved.set(invocation.getArgument(0));
            return saved.get();
        });
        doAnswer(invocation -> {
            assertNotNull(saved.get());
            assertEquals("ASSIGNED", saved.get().getStatus());
            assertEquals(VET_ID, saved.get().getAssignee().getUserId());
            return null;
        }).when(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);

        var response = fixture.service.assign(HORSE_ID, VET_ID, MANAGER_ID);

        assertEquals("ASSIGNED", response.status());
        var order = inOrder(fixture.horses, fixture.assignments, fixture.assessmentNotifications);
        order.verify(fixture.horses).findByIdForUpdate(HORSE_ID);
        order.verify(fixture.assignments).findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc(HORSE_ID, "VET");
        order.verify(fixture.assignments).saveAndFlush(any());
        order.verify(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);
    }

    @Test
    void replacementCancelsOldDraftsBeforeNotifyingNewVet() {
        AssignmentFixture fixture = new AssignmentFixture();
        HorseAssignment previous = fixture.assigned();
        previous.setAssignee(user("VET-OLD", "VETERINARIAN"));
        previous.setStatus("ACCEPTED");
        MedicalRecord oldDraft = new MedicalRecord();
        oldDraft.setMedicalRecordId("MED-OLD");
        oldDraft.setStatus("DRAFT");
        when(fixture.assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc(HORSE_ID, "VET"))
                .thenReturn(Optional.of(previous));
        when(fixture.records.findByHealthProfile_Horse_HorseIdAndStatus(HORSE_ID, "DRAFT"))
                .thenReturn(List.of(oldDraft));
        doAnswer(invocation -> {
            assertEquals("REASSIGNED", previous.getStatus());
            assertEquals("CANCELLED", oldDraft.getStatus());
            return null;
        }).when(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);

        fixture.service.assign(HORSE_ID, VET_ID, MANAGER_ID);

        var order = inOrder(fixture.records, fixture.assignments, fixture.assessmentNotifications);
        order.verify(fixture.records).saveAll(List.of(oldDraft));
        order.verify(fixture.assignments).saveAndFlush(any());
        order.verify(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);
    }

    @Test
    void notificationFailurePropagatesFromAssignmentCreation() {
        AssignmentFixture fixture = new AssignmentFixture();
        RuntimeException failure = new RuntimeException("Notification linkage failed");
        doThrow(failure).when(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> fixture.service.assign(HORSE_ID, VET_ID, MANAGER_ID)));

        verify(fixture.assignments).saveAndFlush(any());
        verify(fixture.notifications, never()).notify(eq(VET_ID), eq("MEDICAL_ASSIGNMENT_CREATED"), any(), any());
        // The actual transaction rollback remains a deferred database check.
    }

    @Test
    void acceptingAssignmentLocksHorseThenRefreshesAssignmentBeforeTrainingHook() {
        AssignmentFixture fixture = new AssignmentFixture();
        HorseAssignment assignment = fixture.assigned();
        fixture.returnAssigned(assignment);
        doAnswer(invocation -> {
            assertEquals("ACCEPTED", assignment.getStatus());
            assertNotNull(assignment.getRespondedAt());
            return null;
        }).when(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);

        assertEquals("ACCEPTED", fixture.service.accept(ASSIGNMENT_ID, VET_ID).status());

        var order = inOrder(fixture.assignments, fixture.horses, fixture.entityManager,
                fixture.assessmentNotifications);
        order.verify(fixture.assignments).findById(ASSIGNMENT_ID);
        order.verify(fixture.horses).findByIdForUpdate(HORSE_ID);
        order.verify(fixture.assignments).findByIdForUpdate(ASSIGNMENT_ID);
        order.verify(fixture.entityManager).refresh(assignment);
        order.verify(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);
    }

    @Test
    void refreshedReassignedRowCannotBeAcceptedUsingStaleSnapshot() {
        AssignmentFixture fixture = new AssignmentFixture();
        HorseAssignment assignment = fixture.assigned();
        fixture.returnAssigned(assignment);
        doAnswer(invocation -> {
            assignment.setStatus("REASSIGNED");
            return null;
        }).when(fixture.entityManager).refresh(assignment);

        assertThrows(BusinessRuleException.class,
                () -> fixture.service.accept(ASSIGNMENT_ID, VET_ID));

        assertEquals("REASSIGNED", assignment.getStatus());
        verify(fixture.entityManager).refresh(assignment);
        verifyNoInteractions(fixture.assessmentNotifications);
    }

    @Test
    void decliningAssignmentNotifiesTrainingAfterTerminalStatusIsRecorded() {
        AssignmentFixture fixture = new AssignmentFixture();
        HorseAssignment assignment = fixture.assigned();
        fixture.returnAssigned(assignment);
        String reason = "Cannot accept this care assignment today.";
        doAnswer(invocation -> {
            assertEquals("DECLINED", assignment.getStatus());
            assertEquals(reason, assignment.getReason());
            return null;
        }).when(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);

        assertEquals("DECLINED", fixture.service.decline(ASSIGNMENT_ID, VET_ID, reason).status());

        verify(fixture.entityManager).refresh(assignment);
        verify(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);
    }

    @Test
    void assignmentHookFailureIsNotSwallowedWhenAccepting() {
        AssignmentFixture fixture = new AssignmentFixture();
        fixture.returnAssigned(fixture.assigned());
        RuntimeException failure = new RuntimeException("Notification delivery failed");
        doThrow(failure).when(fixture.assessmentNotifications).onVeterinaryAssignmentChanged(HORSE_ID);

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> fixture.service.accept(ASSIGNMENT_ID, VET_ID)));

        verify(fixture.audit, never()).record(any(), any(), any(), any(),
                eq("MEDICAL_ASSIGNMENT_ACCEPTED"), any(), any());
    }

    @Test
    void anotherVeterinarianCannotReachHorseLockOrTrainingHook() {
        AssignmentFixture fixture = new AssignmentFixture();
        HorseAssignment assignment = fixture.assigned();
        assignment.setAssignee(user("VET-OTHER", "VETERINARIAN"));
        fixture.returnAssigned(assignment);

        assertThrows(BusinessRuleException.class,
                () -> fixture.service.accept(ASSIGNMENT_ID, VET_ID));

        verify(fixture.horses, never()).findByIdForUpdate(any());
        verify(fixture.assignments, never()).findByIdForUpdate(any());
        verifyNoInteractions(fixture.assessmentNotifications);
    }

    private static User user(String id, String roleName) {
        Role role = new Role();
        role.setRoleName(roleName);
        User user = new User();
        user.setUserId(id);
        user.setFullName(roleName + " user");
        user.setStatus("ACTIVE");
        user.setRole(role);
        return user;
    }

    private static Horse horse() {
        Horse horse = new Horse();
        horse.setHorseId(HORSE_ID);
        horse.setHorseName("Test horse");
        horse.setAdmissionStatus("APPROVED");
        return horse;
    }

    private static final class RecordFixture {
        final ModuleIdAllocator ids = mock(ModuleIdAllocator.class);
        final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
        final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
        final MedicalVitalSignRepository vitals = mock(MedicalVitalSignRepository.class);
        final MedicalClinicalExamRepository exams = mock(MedicalClinicalExamRepository.class);
        final UserRepository users = mock(UserRepository.class);
        final MedicalEvaluationService evaluation = mock(MedicalEvaluationService.class);
        final MedicalRecordMapper mapper = mock(MedicalRecordMapper.class);
        final TrainingLockService locks = mock(TrainingLockService.class);
        final AuditLogService audit = mock(AuditLogService.class);
        final MedicalAssignmentService assignments = mock(MedicalAssignmentService.class);
        final TrainingAssessmentMedicalBridge bridge = mock(TrainingAssessmentMedicalBridge.class);
        final User vet = user(VET_ID, "VETERINARIAN");
        final Horse horse = horse();
        final HealthProfile profile = new HealthProfile();
        final MedicalRecordService service;

        RecordFixture() {
            profile.setProfileId(PROFILE_ID);
            profile.setHorse(horse);
            when(ids.next("MED")).thenReturn(RECORD_ID);
            when(profiles.findById(PROFILE_ID)).thenReturn(Optional.of(profile));
            when(users.findDetailedById(VET_ID)).thenReturn(Optional.of(vet));
            when(records.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(vitals.findByMedicalRecord_MedicalRecordId(anyString())).thenReturn(Optional.empty());
            when(exams.findByMedicalRecord_MedicalRecordId(anyString())).thenReturn(List.of());
            when(evaluation.evaluate(anyString(), any(), any()))
                    .thenReturn(new MedicalEvaluationResult(MedicalEvaluationResult.EvaluationLevel.INCOMPLETE,
                            "Awaiting examination data", null, false));
            service = new MedicalRecordService(profiles, records, vitals, exams, users, evaluation,
                    mapper, locks, audit, assignments, ids, bridge);
        }

        MedicalRecordCreateRequest request(String sessionId) {
            MedicalRecordCreateRequest request = new MedicalRecordCreateRequest();
            request.setProfileId(PROFILE_ID);
            request.setVeterinarianId(VET_ID);
            request.setExamType("INITIAL");
            request.setExaminedAt(EXAMINED_AT);
            request.setPostTrainingSessionId(sessionId);
            return request;
        }

        MedicalRecord draft(String conclusion, MedicalEvaluationResult.EvaluationLevel level) {
            MedicalRecord draft = new MedicalRecord();
            draft.setMedicalRecordId(RECORD_ID);
            draft.setHealthProfile(profile);
            draft.setVeterinarian(vet);
            draft.setExamType("INITIAL");
            draft.setExaminedAt(EXAMINED_AT);
            draft.setStatus("DRAFT");
            draft.setFinalConclusion(conclusion);
            if ("NOT_FIT".equals(conclusion)) {
                draft.setTrainingLockReason("Veterinarian confirmed exercise is unsafe.");
            }
            when(records.findById(RECORD_ID)).thenReturn(Optional.of(draft));
            when(evaluation.evaluate(anyString(), any(), any()))
                    .thenReturn(new MedicalEvaluationResult(level, "Examination reviewed", null,
                            level == MedicalEvaluationResult.EvaluationLevel.CRITICAL));
            return draft;
        }
    }

    private static final class AssignmentFixture {
        final HorseAssignmentRepository assignments = mock(HorseAssignmentRepository.class);
        final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
        final HorseRepository horses = mock(HorseRepository.class);
        final UserRepository users = mock(UserRepository.class);
        final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
        final NotificationService notifications = mock(NotificationService.class);
        final AuditLogService audit = mock(AuditLogService.class);
        final ModuleIdAllocator ids = mock(ModuleIdAllocator.class);
        final TrainingAssessmentNotificationService assessmentNotifications = mock(TrainingAssessmentNotificationService.class);
        final EntityManager entityManager = mock(EntityManager.class);
        final Horse horse = horse();
        final User manager = user(MANAGER_ID, "CLUB_MANAGER");
        final User vet = user(VET_ID, "VETERINARIAN");
        final MedicalAssignmentService service;

        AssignmentFixture() {
            when(users.findDetailedById(MANAGER_ID)).thenReturn(Optional.of(manager));
            when(users.findDetailedById(VET_ID)).thenReturn(Optional.of(vet));
            when(horses.findByIdForUpdate(HORSE_ID)).thenReturn(Optional.of(horse));
            when(assignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc(HORSE_ID, "VET"))
                    .thenReturn(Optional.empty());
            HealthProfile profile = new HealthProfile();
            profile.setProfileId(PROFILE_ID);
            profile.setHorse(horse);
            when(profiles.findByHorse_HorseId(HORSE_ID)).thenReturn(Optional.of(profile));
            when(records.findByHealthProfile_Horse_HorseIdAndStatus(HORSE_ID, "DRAFT"))
                    .thenReturn(List.of());
            when(assignments.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(ids.next("ASN")).thenReturn(ASSIGNMENT_ID);
            service = new MedicalAssignmentService(assignments, records, horses, users, profiles,
                    notifications, audit, ids, assessmentNotifications);
            ReflectionTestUtils.setField(service, "entityManager", entityManager);
        }

        HorseAssignment assigned() {
            HorseAssignment assignment = new HorseAssignment();
            assignment.setId(ASSIGNMENT_ID);
            assignment.setHorse(horse);
            assignment.setKind("VET");
            assignment.setAssignee(vet);
            assignment.setAssignedBy(manager);
            assignment.setStatus("ASSIGNED");
            return assignment;
        }

        void returnAssigned(HorseAssignment assignment) {
            when(assignments.findById(ASSIGNMENT_ID)).thenReturn(Optional.of(assignment));
            when(assignments.findByIdForUpdate(ASSIGNMENT_ID)).thenReturn(Optional.of(assignment));
        }
    }
}
