package com.raceforge.backend.training.service;

import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.entity.TrainingAssessmentReviewStatus;
import com.raceforge.backend.training.mapper.TrainingAssessmentMapper;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentItemRepository;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentRepository;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import java.sql.Date;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Pending predicates and batch UI hints; no database or actual transaction is started. */
class TrainingPendingReviewGuardTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 9, 10, 30);
    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private final Clock clock = Clock.fixed(NOW.atZone(ZONE).toInstant(), ZONE);
    private TrainingSessionAssessmentRepository repository;
    private TrainingAssessmentService service;

    @BeforeEach
    void setUp() {
        repository = mock(TrainingSessionAssessmentRepository.class);
        service = new TrainingAssessmentService(
                repository, mock(TrainingSessionAssessmentItemRepository.class),
                mock(TrainingSessionRepository.class), mock(UserRepository.class),
                new TrainingAssessmentValidator(), new TrainingAssessmentRules(new TrainingAssessmentValidator()),
                mock(TrainingAssessmentAccessService.class), new TrainingAssessmentMapper(),
                mock(jakarta.validation.Validator.class), mock(ApplicationEventPublisher.class),
                mock(AuditLogService.class), clock,
                mock(com.raceforge.backend.horse.repository.HorseRepository.class),
                mock(TrainingAssessmentNotificationService.class));
    }

    @Test
    void pendingReviewProducesStableConflictUsingHorseScope() {
        when(repository.existsBySession_Horse_HorseIdAndReviewStatus(
                "HOR-A", TrainingAssessmentReviewStatus.PENDING)).thenReturn(true);

        ApiException error = assertThrows(ApiException.class,
                () -> service.requireNoPendingReview("HOR-A"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("PENDING_POST_TRAINING_REVIEW", error.getCode());
        verify(repository).existsBySession_Horse_HorseIdAndReviewStatus(
                "HOR-A", TrainingAssessmentReviewStatus.PENDING);
    }

    @Test
    void pendingHorseDoesNotBlockAnotherHorse() {
        when(repository.existsBySession_Horse_HorseIdAndReviewStatus(
                "HOR-A", TrainingAssessmentReviewStatus.PENDING)).thenReturn(true);

        assertThrows(ApiException.class, () -> service.requireNoPendingReview("HOR-A"));
        assertDoesNotThrow(() -> service.requireNoPendingReview("HOR-B"));

        verify(repository).existsBySession_Horse_HorseIdAndReviewStatus(
                "HOR-B", TrainingAssessmentReviewStatus.PENDING);
    }

    @Test
    void guardRechecksPendingAfterEachResolutionInsteadOfCachingFirstResult() {
        when(repository.existsBySession_Horse_HorseIdAndReviewStatus(
                "HOR-A", TrainingAssessmentReviewStatus.PENDING)).thenReturn(true, true, false);

        assertThrows(ApiException.class, () -> service.requireNoPendingReview("HOR-A"));
        assertThrows(ApiException.class, () -> service.requireNoPendingReview("HOR-A"));
        assertDoesNotThrow(() -> service.requireNoPendingReview("HOR-A"));

        verify(repository, times(3)).existsBySession_Horse_HorseIdAndReviewStatus(
                "HOR-A", TrainingAssessmentReviewStatus.PENDING);
        // Actual two-record persistence/resolution remains a deferred integration check.
    }

    @Test
    void noPendingReviewAllowsGuardRegardlessOfDeliveryOrHistoricalReviewState() {
        assertDoesNotThrow(() -> service.requireNoPendingReview("HOR-A"));

        verify(repository).existsBySession_Horse_HorseIdAndReviewStatus(
                "HOR-A", TrainingAssessmentReviewStatus.PENDING);
        verifyNoMoreInteractions(repository);
        // Delivery state is deliberately not consulted: manual Normal requests do not block.
    }

    @Test
    void pendingIdsAreFetchedOnceForTheEntireBatch() {
        Set<String> horseIds = Set.of("HOR-A", "HOR-B", "HOR-C");
        when(repository.pendingHorseIds(horseIds)).thenReturn(Set.of("HOR-A", "HOR-C"));

        assertEquals(Set.of("HOR-A", "HOR-C"), service.pendingHorseIds(horseIds));

        verify(repository).pendingHorseIds(horseIds);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void emptyPendingBatchDoesNotQueryRepository() {
        assertTrue(service.pendingHorseIds(Set.of()).isEmpty());
        verifyNoInteractions(repository);
    }

    @Test
    void coordinatorChecksPendingBeforeTrainerAndUnfinishedWork() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        TrainingAssessmentService checks = mock(TrainingAssessmentService.class);
        TrainingScheduleCoordinator coordinator = coordinator(jdbc, checks);
        ApiException conflict = new ApiException(HttpStatus.CONFLICT,
                "PENDING_POST_TRAINING_REVIEW", "A veterinary review is pending.");
        doThrow(conflict).when(checks).requireNoPendingReview("HOR-A");

        assertSame(conflict, assertThrows(ApiException.class,
                () -> coordinator.requireStartAvailable("HPG-SECOND", "HOR-A", "SES-NEXT")));

        verify(checks).requireNoPendingReview("HOR-A");
        verifyNoInteractions(jdbc);
    }

    @Test
    void coordinatorAppliesPendingAcrossPackagesAndLeavesOtherHorseAvailable() {
        JdbcTemplate jdbc = calendarJdbc();
        TrainingAssessmentService checks = mock(TrainingAssessmentService.class);
        when(checks.pendingHorseIds(anyCollection())).thenReturn(Set.of("HOR-A"));
        TrainingScheduleCoordinator coordinator = coordinator(jdbc, checks);
        TrainingSessionResponse horseAFirstPackage = scheduled("SES-A1", "HOR-A", "PLN-A1", "HPG-A1");
        TrainingSessionResponse horseASecondPackage = scheduled("SES-A2", "HOR-A", "PLN-A2", "HPG-A2");
        TrainingSessionResponse horseB = scheduled("SES-B", "HOR-B", "PLN-B", "HPG-B");

        coordinator.decorate(List.of(horseAFirstPackage, horseASecondPackage, horseB));

        for (TrainingSessionResponse blocked : List.of(horseAFirstPackage, horseASecondPackage)) {
            assertFalse(blocked.getCanStart());
            assertTrue(blocked.getPendingPostTrainingReview());
            assertEquals("PENDING_POST_TRAINING_REVIEW", blocked.getStartBlockedCode());
            assertNotNull(blocked.getStartBlockedReason());
        }
        assertTrue(horseB.getCanStart());
        assertFalse(horseB.getPendingPostTrainingReview());
        assertNull(horseB.getStartBlockedCode());
        verify(checks).pendingHorseIds(argThat(ids -> Set.copyOf(ids).equals(Set.of("HOR-A", "HOR-B"))));
        verify(checks, never()).hasPendingReview(anyString());
    }

    @Test
    void batchQueryCountDoesNotGrowWithRepeatedSessionRows() {
        JdbcTemplate jdbc = calendarJdbc();
        TrainingAssessmentService checks = mock(TrainingAssessmentService.class);
        when(checks.pendingHorseIds(anyCollection())).thenReturn(Set.of("HOR-A"));
        TrainingScheduleCoordinator coordinator = coordinator(jdbc, checks);
        List<TrainingSessionResponse> responses = new ArrayList<>();
        for (int index = 0; index < 100; index++) {
            responses.add(scheduled("SES-" + index, "HOR-A", "PLN-A1", "HPG-A1"));
        }

        coordinator.decorate(responses);

        assertTrue(responses.stream().allMatch(row -> Boolean.FALSE.equals(row.getCanStart())));
        verify(checks, times(1)).pendingHorseIds(Set.of("HOR-A"));
        verify(checks, never()).hasPendingReview(anyString());
        verify(jdbc, times(2)).queryForList(anyString(), any(Object[].class));
        verify(jdbc, times(1)).query(anyString(), any(RowMapper.class));
    }

    @Test
    void pendingReasonHasPriorityForAnUnstartedSessionWithoutChangingStopCompleteHints() {
        JdbcTemplate jdbc = calendarJdbc();
        TrainingAssessmentService checks = mock(TrainingAssessmentService.class);
        when(checks.pendingHorseIds(anyCollection())).thenReturn(Set.of("HOR-A"));
        TrainingScheduleCoordinator coordinator = coordinator(jdbc, checks);
        TrainingSessionResponse response = scheduled("SES-A1", "HOR-A", "PLN-A1", "HPG-A1");
        response.setTrainingLocked(true);
        response.setCanStop(true);
        response.setCanComplete(true);

        coordinator.decorate(List.of(response));

        assertFalse(response.getCanStart());
        assertEquals("PENDING_POST_TRAINING_REVIEW", response.getStartBlockedCode());
        assertTrue(response.getCanStop(), "Pending review only augments Start guards.");
        assertTrue(response.getCanComplete());
    }

    @Test
    void completedOrAlreadyStartedSessionsDoNotClaimPendingIsTheirStartBlockReason() {
        JdbcTemplate jdbc = calendarJdbc();
        TrainingAssessmentService checks = mock(TrainingAssessmentService.class);
        when(checks.pendingHorseIds(anyCollection())).thenReturn(Set.of("HOR-A"));
        TrainingScheduleCoordinator coordinator = coordinator(jdbc, checks);
        TrainingSessionResponse completed = scheduled("SES-DONE", "HOR-A", "PLN-A1", "HPG-A1");
        completed.setStatus("COMPLETED");
        TrainingSessionResponse started = scheduled("SES-WORK", "HOR-A", "PLN-A1", "HPG-A1");
        started.setActualStart(NOW.minusMinutes(5));

        coordinator.decorate(List.of(completed, started));

        assertTrue(completed.getPendingPostTrainingReview());
        assertTrue(started.getPendingPostTrainingReview());
        assertFalse(completed.getCanStart());
        assertFalse(started.getCanStart());
        assertNull(completed.getStartBlockedCode());
        assertNull(started.getStartBlockedCode());
    }

    @Test
    void emptyDecorationDoesNotQueryEitherDependency() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        TrainingAssessmentService checks = mock(TrainingAssessmentService.class);

        coordinator(jdbc, checks).decorate(List.of());

        verifyNoInteractions(jdbc, checks);
    }

    private TrainingScheduleCoordinator coordinator(JdbcTemplate jdbc, TrainingAssessmentService checks) {
        TrainingScheduleCoordinator coordinator = new TrainingScheduleCoordinator(jdbc, clock);
        ReflectionTestUtils.setField(coordinator, "assessmentService", checks);
        return coordinator;
    }

    @SuppressWarnings("unchecked")
    private JdbcTemplate calendarJdbc() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenAnswer(invocation -> {
            String statement = invocation.getArgument(0);
            if (statement.contains("plan_status")) {
                return List.of(validPlan("PLN-A1"), validPlan("PLN-A2"), validPlan("PLN-B"));
            }
            if (statement.contains("Training_Assignment")) {
                return List.of(trainer("HPG-A1"), trainer("HPG-A2"), trainer("HPG-B"));
            }
            return List.of();
        });
        when(jdbc.query(anyString(), any(RowMapper.class))).thenReturn(List.of());
        return jdbc;
    }

    private Map<String, Object> validPlan(String planId) {
        Map<String, Object> row = new HashMap<>();
        row.put("plan_id", planId);
        row.put("assignee_id", "HTR-000001");
        row.put("full_name", "Assigned trainer");
        row.put("plan_status", "ACTIVE");
        row.put("package_status", "ACTIVE");
        row.put("payment_status", "PAID");
        row.put("start_date", Date.valueOf(NOW.toLocalDate().minusDays(5)));
        row.put("end_date", Date.valueOf(NOW.toLocalDate().plusDays(30)));
        return row;
    }

    private Map<String, Object> trainer(String packageId) {
        return Map.of("horse_package_id", packageId, "assignee_id", "HTR-000001",
                "full_name", "Assigned trainer");
    }

    private TrainingSessionResponse scheduled(String sessionId, String horseId, String planId, String packageId) {
        TrainingSessionResponse response = new TrainingSessionResponse();
        response.setSessionId(sessionId);
        response.setHorseId(horseId);
        response.setPlanId(planId);
        response.setHorsePackageId(packageId);
        response.setStatus("SCHEDULED");
        response.setTrainingLocked(false);
        response.setScheduledStart(NOW.plusDays(1));
        response.setScheduledEnd(NOW.plusDays(1).plusMinutes(30));
        return response;
    }
}
