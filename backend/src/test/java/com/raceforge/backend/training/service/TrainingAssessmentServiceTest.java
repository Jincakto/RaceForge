package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.mapper.TrainingAssessmentMapper;
import com.raceforge.backend.training.repository.*;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrainingAssessmentServiceTest {
    static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    final TrainingSessionAssessmentRepository assessments = mock(TrainingSessionAssessmentRepository.class);
    final TrainingSessionAssessmentItemRepository items = mock(TrainingSessionAssessmentItemRepository.class);
    final TrainingSessionRepository sessions = mock(TrainingSessionRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final TrainingAssessmentAccessService access = mock(TrainingAssessmentAccessService.class);
    final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    final AuditLogService audit = mock(AuditLogService.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-11-09T03:00:00Z"), ZoneId.of("Asia/Bangkok"));
    final TrainingAssessmentValidator validator = new TrainingAssessmentValidator();
    final TrainingAssessmentService service = new TrainingAssessmentService(assessments, items, sessions,
            users, validator, new TrainingAssessmentRules(validator), access, new TrainingAssessmentMapper(),
            FACTORY.getValidator(), events, audit, clock,
            mock(com.raceforge.backend.horse.repository.HorseRepository.class),
            mock(TrainingAssessmentNotificationService.class));
    final TrainingSession session = session("SES-001", "HOR-001");
    final User assessor = new User();

    @BeforeEach void prepare() {
        assessor.setUserId("HTR-001"); assessor.setFullName("Trainer One");
        when(access.actor()).thenReturn(new AuthenticatedUser("HTR-001", "trainer@example.com",
                "ACTIVE", 2, "HEAD_TRAINER"));
        when(users.getReferenceById("HTR-001")).thenReturn(assessor);
        when(assessments.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }
    @AfterAll static void closeFactory() { FACTORY.close(); }

    @Test void completionGroupRequiresAssessmentButMissedDefaultGroupDoesNot() {
        var request = new CompleteSessionRequest();
        assertEquals("ASSESSMENT_REQUIRED",
                assertThrows(ApiException.class, () -> service.validateCompletion(request)).getCode());
        var missed = new AttendSessionRequest(); missed.setStatus("MISSED");
        assertTrue(FACTORY.getValidator().validate(missed).isEmpty());
        assertEquals("ASSESSMENT_REQUIRED",
                assertThrows(ApiException.class, () -> service.validateCompletion(missed)).getCode());
    }

    @Test void recordsTenItemsAndNormalNeverCreatesPending() {
        var result = service.recordCompletion(session, request(), "HTR-001");
        assertEquals(10, result.getPassedCount());
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, result.getReviewStatus());
        assertEquals(TrainingAssessmentNotificationStatus.NOT_REQUESTED, result.getNotificationStatus());
        assertEquals(LocalDateTime.of(2026,11,9,10,0), result.getAssessedAt());
        ArgumentCaptor<Iterable<TrainingSessionAssessmentItem>> captured = ArgumentCaptor.forClass(Iterable.class);
        verify(items).saveAll(captured.capture());
        var saved = new ArrayList<TrainingSessionAssessmentItem>(); captured.getValue().forEach(saved::add);
        assertEquals(10, saved.size());
        assertEquals(10, saved.stream().map(TrainingSessionAssessmentItem::getCriterionCode).distinct().count());
        assertTrue(saved.stream().allMatch(i -> i.getAssessment() == result && i.isPassed()));
        verify(events).publishEvent(new TrainingAssessmentRecordedEvent(result));
    }

    @Test void gaitConcernCreatesPendingWithoutChangingSessionOrPackage() {
        var input = request(); var checks = new LinkedHashMap<>(input.checks()); checks.put("BALANCE", false);
        var result = service.recordCompletion(session,
                new TrainingAssessmentRequest(input.checklistVersion(), checks, Map.of("BALANCE", " Uneven gait ")), "HTR-001");
        assertEquals(9, result.getPassedCount());
        assertEquals(TrainingAssessmentAlertLevel.NO_ALERT_DETECTED, result.getBaseAlertLevel());
        assertEquals(TrainingAssessmentAlertLevel.VET_REVIEW_REQUIRED, result.getAlertLevel());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, result.getReviewStatus());
        assertEquals(List.of("BALANCE"), result.getTriggerCodes());
        assertEquals("COMPLETED", session.getStatus());
        assertFalse(Boolean.TRUE.equals(session.getHorse().getTrainingLocked()));
    }

    @Test void duplicateRejectsBeforeSavingOrPublishing() {
        when(assessments.existsById("SES-001")).thenReturn(true);
        assertEquals("ASSESSMENT_ALREADY_EXISTS", assertThrows(ApiException.class,
                () -> service.recordCompletion(session, request(), "HTR-001")).getCode());
        verify(assessments, never()).save(any()); verifyNoInteractions(items, events);
    }

    @Test void synchronousNotificationFailurePropagatesToCompletionTransaction() {
        doThrow(new IllegalStateException("notification unavailable")).when(events).publishEvent(any(Object.class));
        assertThrows(IllegalStateException.class, () -> service.recordCompletion(session, request(), "HTR-001"));
        // This proves propagation only. Real rollback is deliberately deferred until a DB is authorized.
        verify(assessments).save(any()); verify(items).saveAll(any());
    }

    @Test void cannotForgeRecorderIdentity() {
        assertThrows(AccessDeniedException.class, () -> service.recordCompletion(session, request(), "HTR-OTHER"));
        verifyNoInteractions(assessments, items, events);
    }

    @Test void incompleteSessionCannotReceiveAssessment() {
        session.setStatus("SCHEDULED");
        assertEquals("INVALID_SESSION_STATE", assertThrows(ApiException.class,
                () -> service.recordCompletion(session, request(), "HTR-001")).getCode());
        verifyNoInteractions(assessments, items, events);
    }

    @Test void templateHasTenEnglishPerformanceLabelsAndOfficialCodes() {
        var template = service.template();
        assertEquals("POST_TRAINING_V1", template.version()); assertEquals(10, template.criteria().size());
        assertEquals("Normal", template.labels().get("NO_ALERT_DETECTED"));
        assertTrue(template.criteria().stream().anyMatch(c -> c.code().equals("COOPERATION")
                && c.label().equals("Cooperation")));
        assertTrue(template.criteria().stream().allMatch(c -> !c.label().equals(c.code())));
        verify(access).requireTemplate();
    }

    @Test void historicalCompletedSessionHasNoFabricatedAssessment() {
        when(sessions.findById("SES-001")).thenReturn(Optional.of(session));
        when(assessments.findDetailedBySessionId("SES-001")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.get("SES-001"));
        verify(assessments, never()).save(any()); verifyNoInteractions(items, events);
    }

    @Test void detailChecksAccessBeforeReadingAssessment() {
        when(sessions.findById("SES-001")).thenReturn(Optional.of(session));
        doThrow(new AccessDeniedException("outside scope")).when(access).requireRead(session);
        assertThrows(AccessDeniedException.class, () -> service.get("SES-001"));
        verify(assessments, never()).findDetailedBySessionId(anyString());
    }

    @Test void batchEnrichmentDoesNotLoadAssessmentForOwner() {
        var response = new TrainingSessionResponse(); response.setSessionId("SES-001");
        when(access.readableSessionIds(any(), anyList())).thenReturn(Set.of());
        service.enrich(List.of(session), List.of(response));
        assertNull(response.getAssessment()); verifyNoInteractions(assessments, items);
    }

    @Test void batchEnrichmentReadsMetadataAndItemsOnce() {
        var input = request();
        var saved = service.recordCompletion(session, input, "HTR-001");
        clearInvocations(assessments, items, access);
        when(access.readableSessionIds(any(), anyList())).thenReturn(Set.of("SES-001"));
        when(assessments.findAllBySessionIdIn(any())).thenReturn(List.of(saved));
        var answer = new TrainingSessionAssessmentItem(); answer.setAssessment(saved);
        answer.setCriterionCode(TrainingAssessmentCriterion.TASK_COMPLETION); answer.setPassed(true);
        when(items.findByAssessment_SessionIdIn(any())).thenReturn(List.of(answer));
        var response = new TrainingSessionResponse(); response.setSessionId("SES-001");
        service.enrich(List.of(session), List.of(response));
        assertNotNull(response.getAssessment());
        verify(assessments, times(1)).findAllBySessionIdIn(any());
        verify(items, times(1)).findByAssessment_SessionIdIn(any());
        verify(items, never()).findByAssessment_SessionIdOrderByCriterionCodeAsc(anyString());
    }

    private TrainingAssessmentRequest request() {
        Map<String,Boolean> checks = new LinkedHashMap<>();
        for (var c : TrainingAssessmentCriterion.values()) checks.put(c.name(), true);
        return new TrainingAssessmentRequest("POST_TRAINING_V1", checks, Map.of());
    }

    static TrainingSession session(String sessionId, String horseId) {
        var session = new TrainingSession(); session.setSessionId(sessionId); session.setStatus("COMPLETED");
        var horse = new Horse(); horse.setHorseId(horseId); session.setHorse(horse);
        session.setActualStart(LocalDateTime.of(2026,11,9,9,0));
        session.setActualEnd(LocalDateTime.of(2026,11,9,9,30));
        return session;
    }
}
