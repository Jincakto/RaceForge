package com.raceforge.backend.training.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.notification.entity.Notification;
import com.raceforge.backend.notification.repository.NotificationRepository;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.repository.TrainingAssessmentNotificationLinkRepository;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentItemRepository;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.event.EventListener;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Mock-only service checks. These do not establish database rollback or concurrency guarantees. */
@ExtendWith(MockitoExtension.class)
class TrainingAssessmentNotificationServiceTest {
    @Mock TrainingSessionAssessmentRepository assessments;
    @Mock TrainingAssessmentNotificationLinkRepository links;
    @Mock TrainingSessionAssessmentItemRepository items;
    @Mock HorseRepository horses;
    @Mock NotificationRepository notifications;
    @Mock NotificationService notificationService;
    @Mock TrainingAssessmentAccessService access;
    @Mock AuditLogService audit;
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-09T05:00:00Z"), ZoneId.of("Asia/Bangkok"));
    private final List<TrainingAssessmentNotificationLink> savedLinks = new ArrayList<>();
    private TrainingAssessmentNotificationService service;
    private TrainingSessionAssessment assessment;
    private Horse horse;
    private User vet;
    private User manager;

    @BeforeEach
    void setUp() {
        service = new TrainingAssessmentNotificationService(assessments, links, items, horses,
                notifications, notificationService, access, audit, clock);
        horse = new Horse(); horse.setHorseId("HOR-001"); horse.setHorseName("Comet");
        var session = new TrainingSession(); session.setSessionId("SES-001"); session.setHorse(horse);
        session.setStatus("COMPLETED");
        assessment = new TrainingSessionAssessment(); assessment.setSession(session);
        assessment.setChecklistVersion("POST_TRAINING_V1"); assessment.setPassedCount(10);
        assessment.setBaseAlertLevel(TrainingAssessmentAlertLevel.NO_ALERT_DETECTED);
        assessment.setAlertLevel(TrainingAssessmentAlertLevel.NO_ALERT_DETECTED);
        assessment.setReviewStatus(TrainingAssessmentReviewStatus.NOT_REQUIRED);
        assessment.setAssessedAt(LocalDateTime.now(clock));
        assessment.setAssessor(user("HTR-001", "HEAD_TRAINER"));
        vet = user("VET-001", "VETERINARIAN"); manager = user("CM-001", "CLUB_MANAGER");
        lenient().when(access.actor()).thenReturn(actor("HTR-001", "HEAD_TRAINER"));
        lenient().when(access.currentVet("HOR-001", false)).thenReturn(Optional.of(vet));
        lenient().when(access.activeManagers()).thenReturn(List.of(manager));
        lenient().when(horses.findByIdForUpdate("HOR-001")).thenReturn(Optional.of(horse));
        lenient().when(assessments.findByIdForUpdate("SES-001")).thenReturn(Optional.of(assessment));
        lenient().when(assessments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(links.findByAssessment_SessionId(anyString())).thenAnswer(invocation -> savedLinks.stream()
                .filter(link -> invocation.getArgument(0).equals(link.getSessionId())).toList());
        lenient().when(links.existsBySessionIdAndRecipientIdAndNotificationType(anyString(), anyString(), anyString()))
                .thenAnswer(invocation -> savedLinks.stream().anyMatch(link ->
                        invocation.getArgument(0).equals(link.getSessionId())
                        && invocation.getArgument(1).equals(link.getRecipientId())
                        && invocation.getArgument(2).equals(link.getNotificationType())));
        lenient().when(links.save(any())).thenAnswer(invocation -> {
            TrainingAssessmentNotificationLink link = invocation.getArgument(0);
            if (!savedLinks.contains(link)) savedLinks.add(link);
            return link;
        });
        lenient().doAnswer(invocation -> { savedLinks.remove(invocation.getArgument(0)); return null; })
                .when(links).delete(any());
        AtomicInteger nextNotification = new AtomicInteger(100);
        lenient().when(notificationService.notifyAndReturnId(anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(invocation -> nextNotification.incrementAndGet());
        lenient().when(items.findByAssessment_SessionIdOrderByCriterionCodeAsc("SES-001"))
                .thenAnswer(invocation -> List.of(answer(TrainingAssessmentCriterion.BALANCE, false),
                        answer(TrainingAssessmentCriterion.FOCUS, false),
                        answer(TrainingAssessmentCriterion.TASK_COMPLETION, true)));
    }

    @Test
    void normalCompletionDoesNotNotifyOrCreateReviewHold() {
        service.onAssessmentRecorded(new TrainingAssessmentRecordedEvent(assessment));
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
        assertEquals(TrainingAssessmentNotificationStatus.NOT_REQUESTED, assessment.getNotificationStatus());
        verifyNoInteractions(notificationService, links, items, audit);
    }

    @Test
    void warningCompletionNotifiesCurrentVetAndManagersInTheSameSynchronousPath() {
        warning();
        service.onAssessmentRecorded(new TrainingAssessmentRecordedEvent(assessment));
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
        assertEquals(TrainingAssessmentNotificationStatus.SENT, assessment.getNotificationStatus());
        assertEquals(2, savedLinks.size());
        assertTrue(savedLinks.stream().allMatch(link -> link.getNotificationId() != null
                && "AUTO".equals(link.getSource())
                && link.getDeliveryStatus() == TrainingAssessmentNotificationStatus.SENT));
        verify(notificationService).notifyAndReturnId(eq(vet.getUserId()),
                eq(TrainingAssessmentNotificationService.ALERT_TYPE), contains("Vet check needed"), anyString());
        verify(notificationService).notifyAndReturnId(eq(manager.getUserId()),
                eq(TrainingAssessmentNotificationService.ALERT_TYPE), anyString(), anyString());
    }

    @Test
    void urgentTitleAndSummaryAreEnglishAndNeverIncludeObservationNotes() {
        warning(); assessment.setAlertLevel(TrainingAssessmentAlertLevel.URGENT_VET_REVIEW);
        service.notifyAutomatic(assessment);
        ArgumentCaptor<String> message = ArgumentCaptor.forClass(String.class);
        verify(notificationService).notifyAndReturnId(eq(vet.getUserId()), anyString(),
                eq("Urgent vet check for Comet"), message.capture());
        assertTrue(message.getValue().contains("5 of 10 checks passed"));
        assertTrue(message.getValue().contains("Balance"));
        assertTrue(message.getValue().contains("Contact the assigned vet promptly"));
        assertFalse(message.getValue().contains("BALANCE"));
        assertFalse(message.getValue().contains("URGENT_VET_REVIEW"));
        assertFalse(message.getValue().contains("PRIVATE OBSERVATION"));
    }

    @Test
    void duplicateAutomaticEventsDoNotDuplicateNotifications() {
        warning();
        service.notifyAutomatic(assessment); service.notifyAutomatic(assessment);
        verify(notificationService, times(1)).notifyAndReturnId(eq(vet.getUserId()), anyString(), anyString(), anyString());
        verify(notificationService, times(1)).notifyAndReturnId(eq(manager.getUserId()), anyString(), anyString(), anyString());
        assertEquals(2, savedLinks.size());
    }

    @Test
    void missingVetNotifiesManagerAndPersistsWaitingWithoutPretendingVetWasNotified() {
        warning(); when(access.currentVet("HOR-001", false)).thenReturn(Optional.empty());
        service.notifyAutomatic(assessment);
        assertEquals(TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT, assessment.getNotificationStatus());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
        assertEquals(1, savedLinks.stream().filter(link -> link.getNotificationId() == null).count());
        verify(notificationService).notifyAndReturnId(eq(manager.getUserId()), anyString(), contains("assignment needed"), anyString());
        verify(notificationService, never()).notifyAndReturnId(eq(vet.getUserId()), anyString(), anyString(), anyString());
    }

    @Test
    void missingVetAndManagerStillRecordsAWaitingDeliveryInsteadOfFailing() {
        warning(); when(access.currentVet("HOR-001", false)).thenReturn(Optional.empty());
        when(access.activeManagers()).thenReturn(List.of());
        service.notifyAutomatic(assessment);
        assertEquals(1, savedLinks.size());
        assertNull(savedLinks.get(0).getNotificationId());
        assertEquals(TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT, assessment.getNotificationStatus());
        verifyNoInteractions(notificationService);
    }

    @Test
    void normalManualRequestSendsOnlyToVetAndNeverCreatesPendingReview() {
        var response = service.requestManual(assessment, "  Please check recovery.  ");
        assertEquals("SENT", response.requestStatus()); assertFalse(response.startBlocked());
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
        assertEquals(TrainingAssessmentAlertLevel.NO_ALERT_DETECTED, assessment.getAlertLevel());
        assertEquals(1, savedLinks.size()); assertEquals("MANUAL", savedLinks.get(0).getSource());
        assertEquals("Please check recovery.", savedLinks.get(0).getReason());
        verify(notificationService).notifyAndReturnId(eq(vet.getUserId()),
                eq(TrainingAssessmentNotificationService.REQUEST_TYPE), anyString(), contains("Please check recovery."));
        verify(access, never()).activeManagers();
    }

    @Test
    void normalManualRetryIsIdempotentAndKeepsTheOriginalReason() {
        service.requestManual(assessment, "Original reason.");
        var retry = service.requestManual(assessment, "A different reason.");
        assertEquals("ALREADY_SENT", retry.requestStatus()); assertFalse(retry.startBlocked());
        assertEquals("Original reason.", savedLinks.get(0).getReason());
        verify(notificationService, times(1)).notifyAndReturnId(anyString(), anyString(), anyString(), anyString());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n", "\u2003"})
    void normalManualReasonIsRequired(String reason) {
        ApiException failure = assertThrows(ApiException.class, () -> service.requestManual(assessment, reason));
        assertEquals("VET_REQUEST_REASON_REQUIRED", failure.getCode());
        verifyNoInteractions(notificationService);
    }

    @Test
    void normalManualReasonHasMaximumLengthAfterTrimming() {
        ApiException failure = assertThrows(ApiException.class,
                () -> service.requestManual(assessment, "x".repeat(1001)));
        assertEquals("VET_REQUEST_REASON_TOO_LONG", failure.getCode());
        assertDoesNotThrow(() -> service.requestManual(assessment, "  " + "x".repeat(1000) + "  "));
    }

    @Test
    void anExistingHoldFromAnotherAssessmentStillAppearsInTheManualResponse() {
        when(assessments.existsBySession_Horse_HorseIdAndReviewStatus("HOR-001", TrainingAssessmentReviewStatus.PENDING))
                .thenReturn(true);
        assertTrue(service.requestManual(assessment, "Please check.").startBlocked());
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
    }

    @Test
    void autoAlertManualEndpointReturnsExistingStatusWithoutSendingAgainOrRequiringReason() {
        warning(); service.notifyAutomatic(assessment);
        var response = service.requestManual(assessment, null);
        assertEquals("ALREADY_SENT", response.requestStatus()); assertTrue(response.startBlocked());
        verify(notificationService, times(2)).notifyAndReturnId(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void waitingAutoAlertManualEndpointDoesNotCreateAnotherRequest() {
        warning(); when(access.currentVet("HOR-001", false)).thenReturn(Optional.empty());
        service.notifyAutomatic(assessment);
        var response = service.requestManual(assessment, null);
        assertEquals("WAITING_FOR_VET_ASSIGNMENT", response.requestStatus()); assertTrue(response.startBlocked());
        verify(notificationService, times(1)).notifyAndReturnId(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void normalWithoutVetWaitsForAssignmentWithoutCreatingAHold() {
        when(access.currentVet("HOR-001", false)).thenReturn(Optional.empty());
        var response = service.requestManual(assessment, "Please examine after exercise.");
        assertEquals("WAITING_FOR_VET_ASSIGNMENT", response.requestStatus()); assertFalse(response.startBlocked());
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
        var waiting = savedLinks.stream().filter(link -> link.getRecipientId() == null).findFirst().orElseThrow();
        assertEquals("Please examine after exercise.", waiting.getReason());
        verify(notificationService).notifyAndReturnId(eq(manager.getUserId()),
                eq(TrainingAssessmentNotificationService.REQUEST_TYPE), anyString(), anyString());
    }

    @Test
    void normalWaitingManualRequestReachesNewlyAssignedVetAndRemainsNotRequired() {
        when(access.currentVet("HOR-001", false)).thenReturn(Optional.empty());
        service.requestManual(assessment, "Please check this horse.");
        stubAssignmentCandidates();
        when(access.currentVet("HOR-001", false)).thenReturn(Optional.of(vet));
        service.onVeterinaryAssignmentChanged("HOR-001");
        assertEquals(TrainingAssessmentNotificationStatus.SENT, assessment.getNotificationStatus());
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
        assertTrue(savedLinks.stream().noneMatch(link -> link.getRecipientId() == null));
        verify(notificationService, times(1)).notifyAndReturnId(eq(vet.getUserId()), anyString(), anyString(), contains("Please check this horse."));
        verify(notificationService, times(1)).notifyAndReturnId(eq(manager.getUserId()), anyString(), anyString(), anyString());
    }

    @Test
    void replacementVetReceivesPendingAlertOnceAndManagersAreNotSpamNotified() {
        warning(); service.notifyAutomatic(assessment); stubAssignmentCandidates();
        User replacement = user("VET-002", "VETERINARIAN");
        when(access.currentVet("HOR-001", false)).thenReturn(Optional.of(replacement));
        service.onVeterinaryAssignmentChanged("HOR-001");
        service.onVeterinaryAssignmentChanged("HOR-001");
        verify(notificationService, times(1)).notifyAndReturnId(eq(replacement.getUserId()), anyString(), anyString(), anyString());
        verify(notificationService, times(1)).notifyAndReturnId(eq(manager.getUserId()), anyString(), anyString(), anyString());
        assertEquals(TrainingAssessmentReviewStatus.PENDING, assessment.getReviewStatus());
    }

    @Test
    void replacementVetAlsoReceivesAnUnreviewedNormalManualRequest() {
        service.requestManual(assessment, "Please check."); stubAssignmentCandidates();
        User replacement = user("VET-002", "VETERINARIAN");
        when(access.currentVet("HOR-001", false)).thenReturn(Optional.of(replacement));
        service.onVeterinaryAssignmentChanged("HOR-001");
        verify(notificationService).notifyAndReturnId(eq(replacement.getUserId()),
                eq(TrainingAssessmentNotificationService.REQUEST_TYPE), anyString(), anyString());
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
    }

    @Test
    void reviewedNormalRequestDoesNotFollowLaterAssignments() {
        service.requestManual(assessment, "Please check.");
        var record = new MedicalRecord(); record.setMedicalRecordId("MED-001");
        assessment.setReviewedMedicalRecord(record); stubAssignmentCandidates();
        clearInvocations(notificationService);
        service.onVeterinaryAssignmentChanged("HOR-001");
        verifyNoInteractions(notificationService);
    }

    @Test
    void assignmentHookLocksHorseBeforeAssessmentAndHandlesDuplicatedCandidatesOnce() {
        warning(); assessment.setNotificationStatus(TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT);
        stubAssignmentCandidates();
        service.onVeterinaryAssignmentChanged("HOR-001");
        var ordered = inOrder(horses, assessments);
        ordered.verify(horses).findByIdForUpdate("HOR-001");
        ordered.verify(assessments).findByIdForUpdate("SES-001");
        verify(assessments, times(1)).findByIdForUpdate("SES-001");
    }

    @Test
    void successfulTargetReturnsThePersistedSessionAndRequiresCurrentReadScope() {
        service.requestManual(assessment, "Please check.");
        var link = savedLinks.get(0); stubTarget(link, vet.getUserId());
        var target = service.target(link.getNotificationId());
        assertEquals("SES-001", target.sessionId()); assertEquals("HOR-001", target.horseId());
        assertEquals("/training/assessments/SES-001", target.targetPath());
        verify(access).requireRead(assessment.getSession());
    }

    @Test
    void targetOwnershipIsCheckedBeforeAssessmentLookup() {
        assertThrows(ResourceNotFoundException.class, () -> service.target(999));
        verify(notifications).findByNotificationIdAndUserId(999, "HTR-001");
        verify(links, never()).findByNotificationId(anyInt());
        verify(access, never()).requireRead(any());
    }

    @Test
    void formerVetCannotUseAnOldNotificationAfterLosingHorseScope() {
        service.requestManual(assessment, "Please check.");
        var link = savedLinks.get(0); stubTarget(link, vet.getUserId());
        doThrow(new AccessDeniedException("Assignment ended")).when(access).requireRead(assessment.getSession());
        assertThrows(AccessDeniedException.class, () -> service.target(link.getNotificationId()));
    }

    @Test
    void inconsistentLinkRecipientCannotExposeTheAssessment() {
        service.requestManual(assessment, "Please check.");
        var link = savedLinks.get(0); stubTarget(link, "VET-002");
        assertThrows(AccessDeniedException.class, () -> service.target(link.getNotificationId()));
        verify(access, never()).requireRead(any());
    }

    @Test
    void unauthenticatedTargetFailsBeforeReadingNotificationData() {
        when(access.actor()).thenThrow(new AccessDeniedException("Authentication required"));
        assertThrows(AccessDeniedException.class, () -> service.target(100));
        verifyNoInteractions(notifications);
    }

    @Test
    void formerTrainerOrWrongAssignmentCannotSendManualRequest() {
        doThrow(new AccessDeniedException("No current accepted assignment")).when(access).requireWrite(assessment.getSession());
        assertThrows(AccessDeniedException.class, () -> service.requestManual(assessment, "Please check."));
        verifyNoInteractions(notificationService);
    }

    @Test
    void sessionMustAlreadyBeCompletedForManualRequest() {
        assessment.getSession().setStatus("SCHEDULED");
        ApiException failure = assertThrows(ApiException.class, () -> service.requestManual(assessment, "Please check."));
        assertEquals("INVALID_SESSION_STATE", failure.getCode()); verifyNoInteractions(notificationService);
    }

    @Test
    void notificationSaveFailurePropagatesWithoutClaimingDatabaseRollbackWasTested() {
        warning();
        when(notificationService.notifyAndReturnId(eq(vet.getUserId()), anyString(), anyString(), anyString()))
                .thenThrow(new IllegalStateException("Notification storage unavailable"));
        assertThrows(IllegalStateException.class, () -> service.onAssessmentRecorded(new TrainingAssessmentRecordedEvent(assessment)));
        verify(assessments, never()).save(any());
    }

    @Test
    void managerNotificationFailureAlsoPropagatesToTheCompletionCaller() {
        warning();
        when(notificationService.notifyAndReturnId(eq(manager.getUserId()), anyString(), anyString(), anyString()))
                .thenThrow(new IllegalStateException("Manager notification failed"));
        assertThrows(IllegalStateException.class, () -> service.onAssessmentRecorded(new TrainingAssessmentRecordedEvent(assessment)));
    }

    @Test
    void linkSaveFailureIsNotSwallowed() {
        warning(); doThrow(new IllegalStateException("Link save failed")).when(links).save(any());
        assertThrows(IllegalStateException.class, () -> service.notifyAutomatic(assessment));
    }

    @Test
    void nullNotificationIdentifierCannotBeReportedAsASuccessfulDelivery() {
        when(notificationService.notifyAndReturnId(anyString(), anyString(), anyString(), anyString())).thenReturn(null);
        assertThrows(IllegalStateException.class, () -> service.requestManual(assessment, "Please check."));
        assertEquals(TrainingAssessmentNotificationStatus.NOT_REQUESTED, assessment.getNotificationStatus());
    }

    @Test
    void titlesAndMessagesRespectExistingNotificationColumnLimits() {
        horse.setHorseName("C".repeat(300));
        service.requestManual(assessment, "r".repeat(1000));
        ArgumentCaptor<String> title = ArgumentCaptor.forClass(String.class), body = ArgumentCaptor.forClass(String.class);
        verify(notificationService).notifyAndReturnId(anyString(), anyString(), title.capture(), body.capture());
        assertTrue(title.getValue().length() <= 200); assertTrue(body.getValue().length() <= 1000);
    }

    @Test
    void resolvedAssessmentDoesNotGenerateAnotherAutomaticAlert() {
        warning(); assessment.setReviewStatus(TrainingAssessmentReviewStatus.RESOLVED);
        service.notifyAutomatic(assessment);
        verifyNoInteractions(notificationService);
    }

    @Test
    void automaticListenerRequiresTheExistingCompletionTransaction() throws Exception {
        var method = TrainingAssessmentNotificationService.class.getMethod("onAssessmentRecorded", TrainingAssessmentRecordedEvent.class);
        assertNotNull(method.getAnnotation(EventListener.class));
        assertEquals(Propagation.MANDATORY, method.getAnnotation(Transactional.class).propagation());
    }

    @Test
    void retryingANormalRequestWhileAwaitingAssignmentDoesNotNotifyOrAddAnotherPlaceholder() {
        when(access.currentVet("HOR-001", false)).thenReturn(Optional.empty());
        var first = service.requestManual(assessment, "Original reason while awaiting a vet.");
        var retry = service.requestManual(assessment, "A second reason must not replace the first.");
        assertEquals("WAITING_FOR_VET_ASSIGNMENT", first.requestStatus());
        assertEquals("WAITING_FOR_VET_ASSIGNMENT", retry.requestStatus());
        assertFalse(retry.startBlocked());
        assertEquals(TrainingAssessmentReviewStatus.NOT_REQUIRED, assessment.getReviewStatus());
        assertEquals(2, savedLinks.size());
        assertEquals(1, savedLinks.stream().filter(link -> link.getRecipientId() == null).count());
        assertTrue(savedLinks.stream().allMatch(link -> "Original reason while awaiting a vet.".equals(link.getReason())));
        verify(notificationService, times(1)).notifyAndReturnId(eq(manager.getUserId()), anyString(), anyString(), anyString());
        verify(notificationService, never()).notifyAndReturnId(eq(vet.getUserId()), anyString(), anyString(), anyString());
    }

    @Test
    void assignmentNotificationAuditUsesTheCurrentManagerRatherThanTheOriginalAssessor() {
        warning(); service.notifyAutomatic(assessment); stubAssignmentCandidates();
        User replacement = user("VET-002", "VETERINARIAN");
        when(access.currentVet("HOR-001", false)).thenReturn(Optional.of(replacement));
        when(access.actor()).thenReturn(actor(manager.getUserId(), "CLUB_MANAGER"));
        clearInvocations(audit);
        service.onVeterinaryAssignmentChanged("HOR-001");
        verify(audit).record(eq(manager.getUserId()), eq("HOR-001"), eq("TRAINING_ASSESSMENT"),
                eq("SES-001"), eq("TRAINING_ASSESSMENT_NOTIFICATION_SENT"), eq("SUCCESS"),
                eq(TrainingAssessmentNotificationService.ALERT_TYPE + ":VET-002"));
        verify(audit, never()).record(eq("HTR-001"), any(), anyString(), any(), anyString(), anyString(), any());
    }

    @Test
    void notificationTypeMustMatchTheSavedTrainingLinkBeforeReadingAssessmentData() {
        service.requestManual(assessment, "Please check.");
        var link = savedLinks.get(0);
        when(access.actor()).thenReturn(actor(vet.getUserId(), "VETERINARIAN"));
        var unrelated = new Notification(); unrelated.setNotificationId(link.getNotificationId());
        unrelated.setUserId(vet.getUserId()); unrelated.setNotificationType("MEDICAL_ASSIGNMENT_CREATED");
        when(notifications.findByNotificationIdAndUserId(link.getNotificationId(), vet.getUserId()))
                .thenReturn(Optional.of(unrelated));
        when(links.findByNotificationId(link.getNotificationId())).thenReturn(Optional.of(link));
        assertThrows(AccessDeniedException.class, () -> service.target(link.getNotificationId()));
        verify(access, never()).requireRead(any());
    }
    private void warning() {
        assessment.setPassedCount(5); assessment.setBaseAlertLevel(TrainingAssessmentAlertLevel.VET_REVIEW_REQUIRED);
        assessment.setAlertLevel(TrainingAssessmentAlertLevel.VET_REVIEW_REQUIRED);
        assessment.setReviewStatus(TrainingAssessmentReviewStatus.PENDING);
    }

    private void stubAssignmentCandidates() {
        lenient().when(assessments.findByHorseIdAndReviewStatus("HOR-001", TrainingAssessmentReviewStatus.PENDING))
                .thenAnswer(invocation -> assessment.getReviewStatus() == TrainingAssessmentReviewStatus.PENDING
                        ? List.of(assessment) : List.of());
        lenient().when(assessments.findByHorseIdAndNotificationStatus(eq("HOR-001"), any()))
                .thenAnswer(invocation -> assessment.getNotificationStatus() == invocation.getArgument(1)
                        ? List.of(assessment) : List.of());
    }

    private void stubTarget(TrainingAssessmentNotificationLink link, String recipientId) {
        when(access.actor()).thenReturn(actor(recipientId, "VETERINARIAN"));
        var notification = new Notification(); notification.setNotificationId(link.getNotificationId());
        notification.setNotificationType(link.getNotificationType()); notification.setUserId(recipientId);
        when(notifications.findByNotificationIdAndUserId(link.getNotificationId(), recipientId)).thenReturn(Optional.of(notification));
        when(links.findByNotificationId(link.getNotificationId())).thenReturn(Optional.of(link));
    }

    private TrainingSessionAssessmentItem answer(TrainingAssessmentCriterion criterion, boolean passed) {
        var answer = new TrainingSessionAssessmentItem(); answer.setAssessment(assessment);
        answer.setCriterionCode(criterion); answer.setPassed(passed); answer.setFailNote(passed ? null : "PRIVATE OBSERVATION");
        return answer;
    }

    private static User user(String id, String roleName) {
        var role = new Role(); role.setRoleName(roleName);
        var user = new User(); user.setUserId(id); user.setRole(role); user.setStatus("ACTIVE"); user.setFullName(id);
        return user;
    }

    private static AuthenticatedUser actor(String id, String roleName) {
        return new AuthenticatedUser(id, id + "@test.invalid", "ACTIVE", 2, roleName);
    }
}