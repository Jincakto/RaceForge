package com.raceforge.backend.training.service;

import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.dto.AttendSessionRequest;
import com.raceforge.backend.training.dto.CompleteSessionRequest;
import com.raceforge.backend.training.dto.TrainingAssessmentRequest;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.entity.TrainingAssessmentCriterion;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.mapper.TrainingSessionMapper;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Service-level tests only; mock repositories do not demonstrate database rollback or races. */
class TrainingSessionAssessmentCompletionTest {
    private static final String SESSION_ID = "SES-000001";
    private static final String HORSE_ID = "HOR-000001";
    private static final String ACTOR_ID = "HTR-000001";
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 9, 10, 30);
    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");

    private TrainingSessionService service;
    private TrainingSessionRepository sessions;
    private TrainingScheduleCoordinator coordinator;
    private TrainingWorkflowGuard guard;
    private TrainingSessionRules sessionRules;
    private TrainingAssessmentService assessments;
    private TrainingSessionMapper mapper;
    private EntityManager entityManager;
    private TrainingSession session;
    private Horse horse;
    private TrainingPlan plan;
    private TrainingSessionResponse response;

    @BeforeEach
    void setUp() {
        sessions = mock(TrainingSessionRepository.class);
        coordinator = mock(TrainingScheduleCoordinator.class);
        guard = mock(TrainingWorkflowGuard.class);
        sessionRules = mock(TrainingSessionRules.class);
        assessments = mock(TrainingAssessmentService.class);
        mapper = mock(TrainingSessionMapper.class);
        entityManager = mock(EntityManager.class);
        horse = new Horse();
        horse.setHorseId(HORSE_ID);
        horse.setTrainingLocked(false);
        plan = new TrainingPlan();
        plan.setPlanId("PLN-000001");
        plan.setHorseId(HORSE_ID);
        plan.setHorsePackageId("HPG-000001");
        plan.setStatus("ACTIVE");
        session = new TrainingSession();
        session.setSessionId(SESSION_ID);
        session.setHorse(horse);
        session.setPlan(plan);
        session.setStatus("SCHEDULED");
        session.setScheduledStart(NOW.plusDays(2));
        session.setScheduledEnd(NOW.plusDays(2).plusMinutes(30));
        session.setActualStart(NOW.minusMinutes(30));
        session.setActualEnd(NOW.minusMinutes(3));
        session.setRestingHeartRate(42);
        session.setRestingMedicalRecordId("MED-000001");
        session.setRestingMeasuredAt(NOW.minusDays(2));
        session.setHeartRate(65);
        response = new TrainingSessionResponse();

        when(sessions.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(sessions.findByIdForUpdate(SESSION_ID)).thenReturn(Optional.of(session));
        when(sessions.save(any(TrainingSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRules.lockHorse(HORSE_ID)).thenReturn(horse);
        when(guard.actor()).thenReturn(new AuthenticatedUser(ACTOR_ID, "trainer@example.test",
                "ACTIVE", 2, "HEAD_TRAINER"));
        when(mapper.toResponse(session)).thenReturn(response);
        when(assessments.validateCompletion(any(CompleteSessionRequest.class))).thenAnswer(invocation ->
                new TrainingAssessmentValidator().validate(
                        invocation.getArgument(0, CompleteSessionRequest.class).getAssessment()));

        service = new TrainingSessionService();
        ReflectionTestUtils.setField(service, "trainingSessionRepository", sessions);
        ReflectionTestUtils.setField(service, "scheduleCoordinator", coordinator);
        ReflectionTestUtils.setField(service, "workflowGuard", guard);
        ReflectionTestUtils.setField(service, "rules", sessionRules);
        ReflectionTestUtils.setField(service, "assessmentService", assessments);
        ReflectionTestUtils.setField(service, "trainingSessionMapper", mapper);
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        ReflectionTestUtils.setField(service, "audit", mock(AuditLogService.class));
        ReflectionTestUtils.setField(service, "clock", Clock.fixed(NOW.atZone(ZONE).toInstant(), ZONE));
    }

    @Test
    void completionPersistsAssessmentAfterMeasurementsAndBeforeMapping() {
        CompleteSessionRequest request = validRequest();
        LocalDateTime plannedStart = session.getScheduledStart();
        LocalDateTime plannedEnd = session.getScheduledEnd();
        LocalDateTime actualStart = session.getActualStart();
        LocalDateTime actualEnd = session.getActualEnd();

        assertSame(response, service.completeSession(SESSION_ID, request, ACTOR_ID));

        assertEquals("COMPLETED", session.getStatus());
        assertEquals(new BigDecimal("2.50"), session.getDistance());
        assertEquals(12.5, session.getAvgSpeed());
        assertEquals(18.0, session.getMaxSpeed());
        assertNull(session.getEndExerciseHeartRate());
        assertNull(session.getRecoveryHeartRate2Min());
        assertNull(session.getRecoveryMeasuredAt());
        assertEquals("Completed normally.", session.getEvaluation());
        assertEquals(ACTOR_ID, session.getRecordedBy());
        assertEquals(plannedStart, session.getScheduledStart());
        assertEquals(plannedEnd, session.getScheduledEnd());
        assertEquals(actualStart, session.getActualStart());
        assertEquals(actualEnd, session.getActualEnd());
        assertEquals(42, session.getRestingHeartRate());
        assertEquals("MED-000001", session.getRestingMedicalRecordId());
        assertEquals(NOW.minusDays(2), session.getRestingMeasuredAt());
        assertEquals(65, session.getHeartRate(), "The legacy heart-rate field must remain untouched.");

        var order = inOrder(assessments, sessions, mapper);
        order.verify(assessments).validateCompletion(request);
        order.verify(sessions).save(session);
        order.verify(assessments).recordCompletion(eq(session), eq(validAssessment()), eq(ACTOR_ID));
        order.verify(mapper).toResponse(session);
    }

    @Test
    void missingAssessmentFailsBeforeSessionIsMutatedOrSaved() {
        CompleteSessionRequest request = validRequest();
        request.setAssessment(null);

        ApiException error = assertThrows(ApiException.class,
                () -> service.completeSession(SESSION_ID, request, ACTOR_ID));

        assertEquals("ASSESSMENT_REQUIRED", error.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals("SCHEDULED", session.getStatus());
        assertNull(session.getDistance());
        verify(sessions, never()).save(any());
        verify(assessments, never()).recordCompletion(any(), any(), anyString());
        verifyNoInteractions(mapper);
    }

    @Test
    void incompleteAssessmentFailsBeforeSessionIsMutatedOrSaved() {
        CompleteSessionRequest request = validRequest();
        Map<String, Boolean> checks = new LinkedHashMap<>(validAssessment().checks());
        checks.remove("BALANCE");
        request.setAssessment(new TrainingAssessmentRequest("POST_TRAINING_V1", checks, Map.of()));

        ApiException error = assertThrows(ApiException.class,
                () -> service.completeSession(SESSION_ID, request, ACTOR_ID));

        assertEquals("ASSESSMENT_INCOMPLETE", error.getCode());
        assertEquals("SCHEDULED", session.getStatus());
        verify(sessions, never()).save(any());
        verify(assessments, never()).recordCompletion(any(), any(), anyString());
    }

    @Test
    void concernWithoutIndividualNoteCanCompleteAndKeepMeasurements() {
        CompleteSessionRequest request = validRequest();
        Map<String, Boolean> checks = new LinkedHashMap<>(validAssessment().checks());
        checks.put("BALANCE", false);
        request.setAssessment(new TrainingAssessmentRequest("POST_TRAINING_V1", checks, Map.of()));

        assertSame(response, service.completeSession(SESSION_ID, request, ACTOR_ID));

        assertEquals("COMPLETED", session.getStatus());
        assertEquals(new BigDecimal("2.50"), session.getDistance());
        assertNull(session.getEndExerciseHeartRate());
        assertNull(session.getRecoveryHeartRate2Min());
        verify(sessions).save(session);
        verify(assessments).recordCompletion(eq(session), eq(request.getAssessment()), eq(ACTOR_ID));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"Observed stiffness after exercise; please review the completed checks."})
    void allConcernsCanCompleteWithOptionalOverallNotes(String overallNotes) {
        CompleteSessionRequest request = validRequest();
        Map<String, Boolean> checks = new LinkedHashMap<>(validAssessment().checks());
        checks.replaceAll((code, passed) -> false);
        request.setAssessment(new TrainingAssessmentRequest("POST_TRAINING_V1", checks, Map.of()));
        request.setPerformanceNotes(overallNotes);

        assertSame(response, service.completeSession(SESSION_ID, request, ACTOR_ID));

        assertEquals("COMPLETED", session.getStatus());
        assertEquals(overallNotes, session.getEvaluation());
        assertEquals(new BigDecimal("2.50"), session.getDistance());
        assertEquals(12.5, session.getAvgSpeed());
        assertEquals(18.0, session.getMaxSpeed());
        assertNull(session.getEndExerciseHeartRate());
        assertNull(session.getRecoveryHeartRate2Min());
        assertNull(session.getRecoveryMeasuredAt());
        verify(assessments).recordCompletion(eq(session), eq(request.getAssessment()), eq(ACTOR_ID));
    }
    @Test
    void recordingFailurePropagatesRatherThanReturningSuccess() {
        CompleteSessionRequest request = validRequest();
        RuntimeException failure = new RuntimeException("Assessment persistence failed");
        doThrow(failure).when(assessments).recordCompletion(any(), any(), anyString());

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> service.completeSession(SESSION_ID, request, ACTOR_ID)));

        verify(sessions).save(session);
        verifyNoInteractions(mapper);
        // No rollback assertion: a real transactional database is required to prove rollback.
    }

    @Test
    void duplicateCompletionHasStableConflictCode() {
        session.setStatus("COMPLETED");

        ApiException error = assertThrows(ApiException.class,
                () -> service.completeSession(SESSION_ID, validRequest(), ACTOR_ID));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("SESSION_ALREADY_COMPLETED", error.getCode());
        verify(sessions, never()).save(any());
        verify(assessments, never()).recordCompletion(any(), any(), anyString());
    }

    @Test
    void sessionMustBeStoppedBeforeCompleting() {
        session.setActualEnd(null);

        assertThrows(BusinessRuleException.class,
                () -> service.completeSession(SESSION_ID, validRequest(), ACTOR_ID));

        assertEquals("SCHEDULED", session.getStatus());
        verify(sessions, never()).save(any());
        verify(assessments, never()).recordCompletion(any(), any(), anyString());
    }

    @Test
    void sessionMustHaveStartedBeforeCompleting() {
        session.setActualStart(null);

        assertThrows(BusinessRuleException.class,
                () -> service.completeSession(SESSION_ID, validRequest(), ACTOR_ID));

        verify(sessions, never()).save(any());
        verify(assessments, never()).recordCompletion(any(), any(), anyString());
    }

    @Test
    void invalidMeasurementsStillPreventCompletion() {
        CompleteSessionRequest request = validRequest();
        request.setDistance(new java.math.BigDecimal("-1"));

        assertThrows(BusinessRuleException.class,
                () -> service.completeSession(SESSION_ID, request, ACTOR_ID));

        assertEquals("SCHEDULED", session.getStatus());
        verify(sessions, never()).save(any());
        verify(assessments, never()).recordCompletion(any(), any(), anyString());
    }

    @Test
    void currentAuthorizationAndTrainingLockRemainMandatory() {
        doThrow(new org.springframework.security.access.AccessDeniedException("Assignment required"))
                .when(guard).authorizePlan(plan);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.completeSession(SESSION_ID, validRequest(), ACTOR_ID));
        verify(sessions, never()).save(any());

        reset(guard);
        doThrow(new BusinessRuleException("Horse is training-locked"))
                .when(sessionRules).requireUnlocked(horse);
        assertThrows(BusinessRuleException.class,
                () -> service.completeSession(SESSION_ID, validRequest(), ACTOR_ID));
        verify(sessions, never()).save(any());
    }

    @Test
    void lockOrderRemainsScheduleThenHorseThenSession() {
        service.completeSession(SESSION_ID, validRequest(), ACTOR_ID);

        var order = inOrder(coordinator, sessions, sessionRules, entityManager);
        order.verify(coordinator).lockSchedule();
        order.verify(sessions).findById(SESSION_ID);
        order.verify(sessionRules).lockHorse(HORSE_ID);
        order.verify(sessions).findByIdForUpdate(SESSION_ID);
        order.verify(entityManager).refresh(session);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1})
    void startingOnAnotherPlannedDateStillUsesServerTimeAndPackageGuards(int scheduledDayOffset) {
        session.setActualStart(null);
        session.setActualEnd(null);
        session.setScheduledStart(NOW.plusDays(scheduledDayOffset));
        LocalDateTime planned = session.getScheduledStart();
        when(guard.medical(horse)).thenReturn(Map.of(
                "resting_heart_rate", 42,
                "medical_record_id", "MED-000001",
                "examined_at", NOW.minusDays(2)));

        assertSame(response, service.startSession(SESSION_ID));

        assertEquals(NOW, session.getActualStart());
        assertEquals(planned, session.getScheduledStart());
        verify(guard).requirePlan(plan);
        verify(guard).requirePackageDate(plan, HORSE_ID, NOW.toLocalDate());
        verify(sessionRules).requireUnlocked(horse);
        verify(coordinator).requireStartAvailable(plan.getHorsePackageId(), HORSE_ID, SESSION_ID);
        verify(sessions).save(session);
    }

    @Test
    void attendanceCompletedUsesSameValidationAndCannotBypassAssessment() {
        TrainingScheduleService schedule = attendanceService(service);
        AttendSessionRequest request = validAttendance();
        request.setStatus("COMPLETED");
        request.setAssessment(null);

        ApiException error = assertThrows(ApiException.class,
                () -> schedule.submitAttendance(SESSION_ID, request, ACTOR_ID));

        assertEquals("ASSESSMENT_REQUIRED", error.getCode());
        verify(sessions, never()).save(any());
    }

    @Test
    void attendanceCompletedDelegatesTheExactRequestToSharedCompletion() {
        TrainingSessionService sharedCompletion = mock(TrainingSessionService.class);
        TrainingScheduleService schedule = attendanceService(sharedCompletion);
        AttendSessionRequest request = validAttendance();
        request.setStatus("COMPLETED");
        when(sharedCompletion.completeSession(SESSION_ID, request, ACTOR_ID)).thenReturn(response);

        assertSame(response, schedule.submitAttendance(SESSION_ID, request, ACTOR_ID).getSession());

        verify(sharedCompletion).completeSession(SESSION_ID, request, ACTOR_ID);
        verify(sessions, never()).save(any());
    }

    @Test
    void attendanceMissedDoesNotRequireAssessmentOrCallCompletion() {
        TrainingSessionService sharedCompletion = mock(TrainingSessionService.class);
        TrainingScheduleService schedule = attendanceService(sharedCompletion);
        session.setActualStart(null);
        session.setActualEnd(null);
        AttendSessionRequest request = new AttendSessionRequest();
        request.setStatus("MISSED");
        request.setAbsenceReason("BAD_WEATHER");
        request.setAbsenceNote("Heavy rain.");

        assertSame(response, schedule.submitAttendance(SESSION_ID, request, ACTOR_ID).getSession());

        assertEquals("MISSED", session.getStatus());
        assertTrue(session.getNotes().contains("BAD_WEATHER"));
        assertEquals(ACTOR_ID, session.getRecordedBy());
        verifyNoInteractions(sharedCompletion);
        verify(sessions).save(session);
    }

    @Test
    void startPendingConflictIsCheckedAfterAuthorizationAndBeforeOtherBusinessGuards() {
        session.setActualStart(null);
        session.setActualEnd(null);
        ApiException conflict = new ApiException(HttpStatus.CONFLICT,
                "PENDING_POST_TRAINING_REVIEW", "A veterinary review is pending.");
        doThrow(conflict).when(assessments).requireNoPendingReview(HORSE_ID);

        assertSame(conflict, assertThrows(ApiException.class, () -> service.startSession(SESSION_ID)));

        var order = inOrder(guard, assessments);
        order.verify(guard).authorizePlan(plan);
        order.verify(assessments).requireNoPendingReview(HORSE_ID);
        verify(guard, never()).requirePlan(any());
        verify(sessions, never()).save(any());
    }

    @Test
    void unauthorizedStartCannotDiscoverPendingReviewState() {
        session.setActualStart(null);
        session.setActualEnd(null);
        doThrow(new org.springframework.security.access.AccessDeniedException("Assignment required"))
                .when(guard).authorizePlan(plan);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.startSession(SESSION_ID));

        verify(assessments, never()).requireNoPendingReview(anyString());
        verify(sessions, never()).save(any());
    }
    private TrainingScheduleService attendanceService(TrainingSessionService completionService) {
        TrainingScheduleService schedule = new TrainingScheduleService();
        ReflectionTestUtils.setField(schedule, "scheduleCoordinator", coordinator);
        ReflectionTestUtils.setField(schedule, "sessionService", completionService);
        ReflectionTestUtils.setField(schedule, "sessionRepository", sessions);
        ReflectionTestUtils.setField(schedule, "workflowGuard", guard);
        ReflectionTestUtils.setField(schedule, "rules", sessionRules);
        ReflectionTestUtils.setField(schedule, "sessionMapper", mapper);
        return schedule;
    }

    private CompleteSessionRequest validRequest() {
        CompleteSessionRequest request = new CompleteSessionRequest();
        populateMeasurements(request);
        return request;
    }

    private AttendSessionRequest validAttendance() {
        AttendSessionRequest request = new AttendSessionRequest();
        populateMeasurements(request);
        return request;
    }

    private void populateMeasurements(CompleteSessionRequest request) {
        request.setDistance(new BigDecimal("2.50"));
        request.setAvgSpeed(12.5);
        request.setMaxSpeed(18.0);



        request.setPerformanceNotes("Completed normally.");
        request.setAssessment(validAssessment());
    }

    private TrainingAssessmentRequest validAssessment() {
        Map<String, Boolean> checks = new LinkedHashMap<>();
        for (TrainingAssessmentCriterion criterion : TrainingAssessmentCriterion.values()) {
            checks.put(criterion.name(), true);
        }
        return new TrainingAssessmentRequest("POST_TRAINING_V1", checks, Map.of());
    }
}
