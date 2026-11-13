package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.notification.repository.NotificationRepository;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.training.dto.TrainingNotificationTargetResponse;
import com.raceforge.backend.training.dto.TrainingVetNotificationResponse;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.repository.TrainingAssessmentNotificationLinkRepository;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentItemRepository;
import com.raceforge.backend.training.repository.TrainingSessionAssessmentRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** In-app delivery and technical links only; veterinary examinations keep their existing workflow. */
@Service
public class TrainingAssessmentNotificationService {
    public static final String ALERT_TYPE = "TRAINING_ASSESSMENT_ALERT";
    public static final String REQUEST_TYPE = "TRAINING_ASSESSMENT_REQUEST";
    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final TrainingSessionAssessmentRepository assessments;
    private final TrainingAssessmentNotificationLinkRepository links;
    private final TrainingSessionAssessmentItemRepository items;
    private final HorseRepository horses;
    private final NotificationRepository notifications;
    private final NotificationService notificationService;
    private final TrainingAssessmentAccessService access;
    private final AuditLogService audit;
    private final Clock clock;

    public TrainingAssessmentNotificationService(TrainingSessionAssessmentRepository assessments,
            TrainingAssessmentNotificationLinkRepository links, TrainingSessionAssessmentItemRepository items,
            HorseRepository horses, NotificationRepository notifications, NotificationService notificationService,
            TrainingAssessmentAccessService access, AuditLogService audit,
            @Qualifier("trainingClock") Clock clock) {
        this.assessments = assessments;
        this.links = links;
        this.items = items;
        this.horses = horses;
        this.notifications = notifications;
        this.notificationService = notificationService;
        this.access = access;
        this.audit = audit;
        this.clock = clock;
    }

    /** Synchronous delivery participates in completion; any save failure must roll completion back. */
    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onAssessmentRecorded(TrainingAssessmentRecordedEvent event) {
        notifyAutomatic(event.assessment());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void notifyAutomatic(TrainingSessionAssessment assessment) {
        if (assessment.getAlertLevel() == TrainingAssessmentAlertLevel.NO_ALERT_DETECTED
                || assessment.getReviewStatus() != TrainingAssessmentReviewStatus.PENDING) {
            return;
        }
        deliver(assessment, ALERT_TYPE, "AUTO", null, true);
    }

    /** The caller holds horse -> assessment locks in the existing transaction. */
    @Transactional(propagation = Propagation.MANDATORY)
    public TrainingVetNotificationResponse requestManual(TrainingSessionAssessment assessment, String reason) {
        access.requireWrite(assessment.getSession());
        if (!"COMPLETED".equals(assessment.getSession().getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_SESSION_STATE",
                    "Complete this session before requesting a vet check.");
        }
        if (assessment.getAlertLevel() != TrainingAssessmentAlertLevel.NO_ALERT_DETECTED) {
            return response(assessment, assessment.getNotificationStatus() == TrainingAssessmentNotificationStatus.SENT);
        }
        String trimmed = validateReason(reason);
        if (assessment.getNotificationStatus() != TrainingAssessmentNotificationStatus.NOT_REQUESTED) {
            return response(assessment, assessment.getNotificationStatus() == TrainingAssessmentNotificationStatus.SENT);
        }
        deliver(assessment, REQUEST_TYPE, "MANUAL", trimmed, false);
        audit.record(access.actor().userId(), assessment.getHorseId(), "TRAINING_ASSESSMENT",
                assessment.getSessionId(), "TRAINING_ASSESSMENT_VET_REQUESTED", "SUCCESS", trimmed);
        return response(assessment, false);
    }

    /** Recipient ownership is checked before looking up the assessment or its horse. */
    @Transactional(readOnly = true)
    public TrainingNotificationTargetResponse target(Integer notificationId) {
        var actor = access.actor();
        var notification = notifications.findByNotificationIdAndUserId(notificationId, actor.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        var link = links.findByNotificationId(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Training notification target not found"));
        if (!actor.userId().equals(link.getRecipientId())
                || !Objects.equals(notification.getNotificationType(), link.getNotificationType())) {
            throw new AccessDeniedException("This notification does not belong to your account.");
        }
        access.requireRead(link.getAssessment().getSession());
        return new TrainingNotificationTargetResponse(link.getSessionId(), link.getAssessment().getHorseId(),
                "TRAINING_ASSESSMENT", "/training/assessments/" + link.getSessionId());
    }

    /** Reassignment and operational retry share the same idempotent path; no external queue is involved. */
    @Transactional
    public void onVeterinaryAssignmentChanged(String horseId) {
        horses.findByIdForUpdate(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        Map<String, TrainingSessionAssessment> candidates = new LinkedHashMap<>();
        assessments.findByHorseIdAndReviewStatus(horseId, TrainingAssessmentReviewStatus.PENDING)
                .forEach(a -> candidates.put(a.getSessionId(), a));
        assessments.findByHorseIdAndNotificationStatus(horseId,
                        TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT)
                .forEach(a -> candidates.put(a.getSessionId(), a));
        // A manually requested, still-unreviewed Normal assessment follows a replacement vet too.
        assessments.findByHorseIdAndNotificationStatus(horseId, TrainingAssessmentNotificationStatus.SENT).stream()
                .filter(a -> a.getAlertLevel() == TrainingAssessmentAlertLevel.NO_ALERT_DETECTED)
                .filter(a -> a.getReviewedMedicalRecordId() == null)
                .forEach(a -> candidates.put(a.getSessionId(), a));
        for (String sessionId : candidates.keySet().stream().sorted().toList()) {
            var assessment = assessments.findByIdForUpdate(sessionId).orElse(null);
            if (assessment == null || !horseId.equals(assessment.getHorseId())) {
                continue;
            }
            if (assessment.getReviewStatus() == TrainingAssessmentReviewStatus.PENDING) {
                notifyAutomatic(assessment);
            } else if (assessment.getAlertLevel() == TrainingAssessmentAlertLevel.NO_ALERT_DETECTED
                    && assessment.getReviewedMedicalRecordId() == null
                    && assessment.getNotificationStatus() != TrainingAssessmentNotificationStatus.NOT_REQUESTED) {
                var previous = links.findByAssessment_SessionId(sessionId);
                Optional<String> reason = previous.stream().filter(link -> "MANUAL".equals(link.getSource()))
                        .map(TrainingAssessmentNotificationLink::getReason).filter(Objects::nonNull)
                        .filter(value -> !value.isBlank()).findFirst();
                if (reason.isEmpty()) {
                    throw new IllegalStateException("The saved manual vet check request is missing its reason.");
                }
                deliver(assessment, REQUEST_TYPE, "MANUAL", reason.get(), false);
            }
        }
    }

    private void deliver(TrainingSessionAssessment assessment, String type, String source, String reason,
            boolean alwaysNotifyManagers) {
        List<TrainingAssessmentNotificationLink> existing = new ArrayList<>(
                links.findByAssessment_SessionId(assessment.getSessionId()));
        Optional<User> vet = access.currentVet(assessment.getHorseId(), false);
        String summary = summary(assessment, reason);
        if (vet.isPresent()) {
            send(assessment, vet.get().getUserId(), type, source, reason,
                    title(assessment, false), summary, existing, true);
            assessment.setNotificationStatus(TrainingAssessmentNotificationStatus.SENT);
            // A waiting placeholder is only retained until a real vet delivery exists.
            for (var link : existing) {
                if (link.getRecipientId() == null && type.equals(link.getNotificationType())
                        && link.getDeliveryStatus() == TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT) {
                    links.delete(link);
                }
            }
        } else {
            ensureWaiting(assessment, type, source, reason, existing);
            assessment.setNotificationStatus(TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT);
        }
        if (alwaysNotifyManagers || vet.isEmpty()) {
            for (User manager : access.activeManagers()) {
                send(assessment, manager.getUserId(), type, source, reason,
                        title(assessment, vet.isEmpty()), summary, existing, false);
            }
        }
        // Delivery status and review status are independent. Never create or clear a review hold here.
        assessments.save(assessment);
    }

    private void send(TrainingSessionAssessment assessment, String recipient, String type, String source,
            String reason, String title, String message, List<TrainingAssessmentNotificationLink> existing, boolean recipientIsVet) {
        if (links.existsBySessionIdAndRecipientIdAndNotificationType(assessment.getSessionId(), recipient, type)) {
            return;
        }
        var waiting = existing.stream().filter(link -> link.getRecipientId() == null
                && type.equals(link.getNotificationType())
                && link.getDeliveryStatus() == TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT)
                .findFirst();
        // Only the current vet may consume the waiting-vet placeholder, never a manager.
        var link = recipientIsVet && waiting.isPresent() ? waiting.get() : new TrainingAssessmentNotificationLink();
        Integer notificationId = notificationService.notifyAndReturnId(recipient, type,
                truncate(title, 200), truncate(message, 1000));
        if (notificationId == null) {
            throw new IllegalStateException("A saved notification must have an identifier.");
        }
        link.setAssessment(assessment);
        link.setNotificationId(notificationId);
        link.setRecipientId(recipient);
        link.setNotificationType(type);
        link.setSource(source);
        link.setReason(reason);
        link.setDeliveryStatus(TrainingAssessmentNotificationStatus.SENT);
        if (link.getCreatedAt() == null) link.setCreatedAt(LocalDateTime.now(clock));
        link.setSentAt(LocalDateTime.now(clock));
        links.save(link);
        audit.record(access.actor().userId(), assessment.getHorseId(), "TRAINING_ASSESSMENT",
                assessment.getSessionId(), "TRAINING_ASSESSMENT_NOTIFICATION_SENT", "SUCCESS", type + ":" + recipient);
    }

    private void ensureWaiting(TrainingSessionAssessment assessment, String type, String source, String reason,
            List<TrainingAssessmentNotificationLink> existing) {
        if (existing.stream().anyMatch(link -> link.getRecipientId() == null
                && type.equals(link.getNotificationType())
                && link.getDeliveryStatus() == TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT)) {
            return;
        }
        var waiting = new TrainingAssessmentNotificationLink();
        waiting.setAssessment(assessment);
        waiting.setNotificationType(type);
        waiting.setSource(source);
        waiting.setReason(reason);
        waiting.setDeliveryStatus(TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT);
        waiting.setCreatedAt(LocalDateTime.now(clock));
        links.save(waiting);
        audit.record(access.actor().userId(), assessment.getHorseId(), "TRAINING_ASSESSMENT",
                assessment.getSessionId(), "TRAINING_ASSESSMENT_WAITING_FOR_VET", "SUCCESS", null);
    }

    private TrainingVetNotificationResponse response(TrainingSessionAssessment assessment, boolean alreadySent) {
        boolean waiting = assessment.getNotificationStatus() == TrainingAssessmentNotificationStatus.WAITING_FOR_VET_ASSIGNMENT;
        boolean notRequested = assessment.getNotificationStatus() == TrainingAssessmentNotificationStatus.NOT_REQUESTED;
        String requestStatus = waiting ? "WAITING_FOR_VET_ASSIGNMENT" : notRequested ? "NOT_REQUESTED"
                : alreadySent ? "ALREADY_SENT" : "SENT";
        String message = waiting ? "Waiting for a vet assignment. Please contact the club manager."
                : notRequested ? "No vet check notification has been sent."
                : alreadySent ? "A vet check notification has already been sent." : "Vet notification sent.";
        boolean blocked = assessment.getReviewStatus() == TrainingAssessmentReviewStatus.PENDING
                || assessments.existsBySession_Horse_HorseIdAndReviewStatus(
                        assessment.getHorseId(), TrainingAssessmentReviewStatus.PENDING);
        return new TrainingVetNotificationResponse(assessment.getSessionId(), requestStatus, blocked, message);
    }

    private String validateReason(String reason) {
        if (reason == null || reason.strip().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VET_REQUEST_REASON_REQUIRED",
                    "Add a reason for requesting a vet check.");
        }
        String trimmed = reason.strip();
        if (trimmed.length() > 1000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VET_REQUEST_REASON_TOO_LONG",
                    "Keep the vet check reason within 1,000 characters.");
        }
        return trimmed;
    }

    private String title(TrainingSessionAssessment assessment, boolean missingVet) {
        String horseName = assessment.getSession().getHorse().getHorseName();
        String horse = horseName == null || horseName.isBlank() ? assessment.getHorseId() : horseName;
        if (missingVet) return (assessment.getAlertLevel() == TrainingAssessmentAlertLevel.URGENT_VET_REVIEW
                ? "Urgent vet assignment needed for " : "Vet assignment needed for ") + horse;
        if (assessment.getAlertLevel() == TrainingAssessmentAlertLevel.URGENT_VET_REVIEW) {
            return "Urgent vet check for " + horse;
        }
        return assessment.getAlertLevel() == TrainingAssessmentAlertLevel.NO_ALERT_DETECTED
                ? "Vet check requested for " + horse : "Vet check needed for " + horse;
    }

    private String summary(TrainingSessionAssessment assessment, String reason) {
        String concerns = items.findByAssessment_SessionIdOrderByCriterionCodeAsc(assessment.getSessionId()).stream()
                .filter(item -> !item.isPassed())
                .sorted(Comparator.comparing(item -> item.getCriterionCode().ordinal()))
                .map(item -> item.getCriterionCode().label()).collect(Collectors.joining(", "));
        String result = "Horse " + assessment.getHorseId() + "; session " + assessment.getSessionId()
                + "; assessed " + assessment.getAssessedAt().format(DISPLAY_TIME) + ". "
                + assessment.getPassedCount() + " of 10 checks passed. " + assessment.getAlertLevel().label() + ".";
        if (!concerns.isBlank()) result += " Concerns: " + concerns + ".";
        if (reason != null) result += " Trainer request: " + reason;
        if (assessment.getAlertLevel() == TrainingAssessmentAlertLevel.URGENT_VET_REVIEW) {
            result += " Contact the assigned vet promptly. Do not rely only on this notification.";
        }
        return result;
    }

    private String truncate(String value, int limit) {
        return value.length() <= limit ? value : value.substring(0, limit - 3) + "...";
    }
}