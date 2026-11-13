package com.raceforge.backend.training.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.notification.controller.NotificationController;
import com.raceforge.backend.notification.entity.Notification;
import com.raceforge.backend.notification.repository.NotificationRepository;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.TrainingAssessmentReviewStatus;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.entity.TrainingSessionAssessment;
import com.raceforge.backend.training.mapper.TrainingAssessmentMapper;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentItemRepository;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentRepository;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import jakarta.validation.Validator;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;

/** Existing bell controller plus real pending guard, with repositories mocked and no database. */
class TrainingNotificationReadTest {
    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final TrainingSessionAssessmentRepository assessments = mock(TrainingSessionAssessmentRepository.class);
    private final NotificationController controller = new NotificationController(notifications);
    private final TrainingSessionAssessment pending = new TrainingSessionAssessment();
    private final Notification notification = new Notification();
    private final AuthenticatedUser vet = new AuthenticatedUser("VET-001", "vet@example.test", "ACTIVE", 3, "VETERINARIAN");
    private TrainingAssessmentService core;

    @BeforeEach
    void setUp() {
        var horse = new Horse(); horse.setHorseId("HOR-001");
        var session = new TrainingSession(); session.setSessionId("SES-001"); session.setHorse(horse);
        pending.setSession(session); pending.setReviewStatus(TrainingAssessmentReviewStatus.PENDING);
        notification.setNotificationId(77); notification.setUserId(vet.userId());
        notification.setNotificationType(TrainingAssessmentNotificationService.ALERT_TYPE);
        notification.setTitle("Vet check needed for Comet"); notification.setMessage("Please review the post-training observations.");
        notification.setCreatedAt(Instant.parse("2026-11-10T03:00:00Z")); notification.setRead(false);
        when(notifications.findByNotificationIdAndUserId(77, vet.userId())).thenReturn(Optional.of(notification));
        when(notifications.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(assessments.existsBySession_Horse_HorseIdAndReviewStatus("HOR-001", TrainingAssessmentReviewStatus.PENDING))
                .thenAnswer(invocation -> pending.getReviewStatus() == TrainingAssessmentReviewStatus.PENDING);
        var validator = new TrainingAssessmentValidator();
        core = new TrainingAssessmentService(assessments, mock(TrainingSessionAssessmentItemRepository.class),
                mock(TrainingSessionRepository.class), mock(UserRepository.class), validator,
                new TrainingAssessmentRules(validator), mock(TrainingAssessmentAccessService.class),
                new TrainingAssessmentMapper(), mock(Validator.class), mock(ApplicationEventPublisher.class),
                mock(AuditLogService.class), Clock.fixed(notification.getCreatedAt(), ZoneId.of("Asia/Bangkok")),
                mock(HorseRepository.class), mock(TrainingAssessmentNotificationService.class));
    }

    @Test
    void markingTheExistingBellNotificationReadDoesNotResolveReviewOrAllowStart() {
        assertPendingGuard();
        var response = controller.markRead(77, vet);
        assertTrue(response.read()); assertTrue(notification.isRead());
        assertEquals(77, response.notificationId());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, pending.getReviewStatus());
        assertPendingGuard();
        verify(notifications).findByNotificationIdAndUserId(77, vet.userId());
        verify(notifications).save(notification);
        verify(assessments, never()).save(any());
    }

    @Test
    void anotherUserCannotMarkTheNotificationReadOrChangeTheReview() {
        var other = new AuthenticatedUser("VET-002", "other@example.test", "ACTIVE", 3, "VETERINARIAN");
        when(notifications.findByNotificationIdAndUserId(77, other.userId())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> controller.markRead(77, other));
        assertFalse(notification.isRead());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, pending.getReviewStatus());
        assertPendingGuard();
        verify(notifications, never()).save(any());
        verify(assessments, never()).save(any());
    }

    @Test
    void repeatedlyMarkingReadStillLeavesTheSameReviewPending() {
        assertTrue(controller.markRead(77, vet).read());
        assertTrue(controller.markRead(77, vet).read());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, pending.getReviewStatus());
        assertPendingGuard();
        verify(notifications, times(2)).save(notification);
        verify(assessments, never()).save(any());
    }

    @Test
    void existingVoidNotifyStillCreatesTheSameBellNotificationAsTheIdReturningMethod() {
        var repository = mock(NotificationRepository.class);
        when(repository.save(any())).thenAnswer(invocation -> {
            Notification saved = invocation.getArgument(0);
            saved.setNotificationId(88);
            return saved;
        });
        var service = new NotificationService(repository);
        service.notify(vet.userId(), "EXISTING_NOTIFICATION", "Existing title", "Existing message");
        Integer id = service.notifyAndReturnId(vet.userId(), "EXISTING_NOTIFICATION", "Existing title", "Existing message");
        assertEquals(88, id);
        ArgumentCaptor<Notification> captured = ArgumentCaptor.forClass(Notification.class);
        verify(repository, times(2)).save(captured.capture());
        for (Notification saved : captured.getAllValues()) {
            assertEquals(vet.userId(), saved.getUserId());
            assertEquals("EXISTING_NOTIFICATION", saved.getNotificationType());
            assertEquals("Existing title", saved.getTitle());
            assertEquals("Existing message", saved.getMessage());
            assertFalse(saved.isRead()); assertNotNull(saved.getCreatedAt());
        }
    }

    private void assertPendingGuard() {
        ApiException failure = assertThrows(ApiException.class, () -> core.requireNoPendingReview("HOR-001"));
        assertEquals("PENDING_POST_TRAINING_REVIEW", failure.getCode());
        assertEquals(HttpStatus.CONFLICT, failure.getStatus());
    }
}