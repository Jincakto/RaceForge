package com.raceforge.backend.training.service;

import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.mapper.TrainingAssessmentMapper;
import com.raceforge.backend.training.repository.*;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Assessment lifecycle. Medical locks and package validity remain independent. */
@Service
public class TrainingAssessmentService {
    private final TrainingSessionAssessmentRepository assessments;
    private final TrainingSessionAssessmentItemRepository items;
    private final TrainingSessionRepository sessions;
    private final UserRepository users;
    private final TrainingAssessmentValidator validator;
    private final TrainingAssessmentRules rules;
    private final TrainingAssessmentAccessService access;
    private final TrainingAssessmentMapper mapper;
    private final jakarta.validation.Validator beanValidator;
    private final ApplicationEventPublisher events;
    private final AuditLogService audit;
    private final Clock clock;
    private final com.raceforge.backend.horse.repository.HorseRepository horses;
    private final TrainingAssessmentNotificationService notifications;

    public TrainingAssessmentService(TrainingSessionAssessmentRepository assessments,
            TrainingSessionAssessmentItemRepository items, TrainingSessionRepository sessions,
            UserRepository users, TrainingAssessmentValidator validator, TrainingAssessmentRules rules,
            TrainingAssessmentAccessService access, TrainingAssessmentMapper mapper,
            jakarta.validation.Validator beanValidator, ApplicationEventPublisher events,
            AuditLogService audit, @Qualifier("trainingClock") Clock clock,
            com.raceforge.backend.horse.repository.HorseRepository horses,
            TrainingAssessmentNotificationService notifications) {
        this.assessments = assessments;
        this.items = items;
        this.sessions = sessions;
        this.users = users;
        this.validator = validator;
        this.rules = rules;
        this.access = access;
        this.mapper = mapper;
        this.beanValidator = beanValidator;
        this.events = events;
        this.audit = audit;
        this.clock = clock;
        this.horses = horses;
        this.notifications = notifications;
    }

    public TrainingAssessmentTemplateResponse template() {
        access.requireTemplate();
        var criteria = Arrays.stream(TrainingAssessmentCriterion.values())
                .map(c -> new TrainingAssessmentTemplateResponse.Criterion(c.name(), c.label(), c.helpText()))
                .toList();
        Map<String, String> labels = new LinkedHashMap<>();
        for (var level : TrainingAssessmentAlertLevel.values()) labels.put(level.name(), level.label());
        return new TrainingAssessmentTemplateResponse(TrainingAssessmentValidator.CHECKLIST_VERSION,
                criteria, Collections.unmodifiableMap(labels));
    }

    /** Default-group attendance validation must keep MISSED independent of completion requirements. */
    public TrainingAssessmentRequest validateCompletion(CompleteSessionRequest request) {
        if (request == null || !beanValidator.validate(request, CompletionRequired.class).isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ASSESSMENT_REQUIRED",
                    "Complete the post-training health check before saving.");
        }
        return validator.validate(request.getAssessment());
    }

    /** Called after measurements are saved, inside the existing completion transaction/locks. */
    @Transactional(propagation = Propagation.MANDATORY)
    public TrainingSessionAssessment recordCompletion(TrainingSession session,
            TrainingAssessmentRequest request, String actorId) {
        access.requireWrite(session);
        if (!Objects.equals(access.actor().userId(), actorId)) {
            throw new AccessDeniedException("Record the health check using your authenticated account.");
        }
        if (!"COMPLETED".equals(session.getStatus()) || session.getActualStart() == null
                || session.getActualEnd() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_SESSION_STATE",
                    "Stop the exercise and complete its measurements before recording the health check.");
        }
        TrainingAssessmentRequest validated = validator.validate(request);
        if (assessments.existsById(session.getSessionId())) {
            throw new ApiException(HttpStatus.CONFLICT, "ASSESSMENT_ALREADY_EXISTS",
                    "A post-training health check has already been recorded for this session.");
        }
        var evaluation = rules.evaluate(validated);
        var assessment = new TrainingSessionAssessment();
        assessment.setSession(session);
        assessment.setChecklistVersion(validated.checklistVersion());
        assessment.setPassedCount(evaluation.passedCount());
        assessment.setBaseAlertLevel(evaluation.passedCount() <= 3
                ? TrainingAssessmentAlertLevel.URGENT_VET_REVIEW
                : evaluation.passedCount() <= 6 ? TrainingAssessmentAlertLevel.VET_REVIEW_REQUIRED
                : TrainingAssessmentAlertLevel.NO_ALERT_DETECTED);
        assessment.setAlertLevel(evaluation.alertLevel());
        assessment.setTriggerCodes(evaluation.triggerCodes());
        assessment.setReviewStatus(evaluation.alertLevel() == TrainingAssessmentAlertLevel.NO_ALERT_DETECTED
                ? TrainingAssessmentReviewStatus.NOT_REQUIRED : TrainingAssessmentReviewStatus.PENDING);
        assessment.setNotificationStatus(TrainingAssessmentNotificationStatus.NOT_REQUESTED);
        assessment.setAssessor(users.getReferenceById(actorId));
        assessment.setAssessedAt(LocalDateTime.now(clock));
        // Keep the managed instance returned by Spring Data for child associations.
        var saved = assessments.save(assessment);
        List<TrainingSessionAssessmentItem> answers = new ArrayList<>();
        for (var criterion : TrainingAssessmentCriterion.values()) {
            var answer = new TrainingSessionAssessmentItem();
            answer.setAssessment(saved);
            answer.setCriterionCode(criterion);
            answer.setPassed(validated.checks().get(criterion.name()));
            answer.setFailNote(validated.failNotes().get(criterion.name()));
            answers.add(answer);
        }
        items.saveAll(answers);
        audit.record(actorId, saved.getHorseId(), "TRAINING_ASSESSMENT", saved.getSessionId(),
                "TRAINING_ASSESSMENT_RECORDED", "SUCCESS", saved.getAlertLevel().name());
        // Spring's synchronous listener joins this transaction and propagates delivery failures.
        events.publishEvent(new TrainingAssessmentRecordedEvent(saved));
        return saved;
    }

    @Transactional(readOnly = true)
    public TrainingAssessmentResponse get(String sessionId) {
        var session = sessions.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Training session not found"));
        access.requireRead(session);
        var assessment = assessments.findDetailedBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("No post-training assessment recorded"));
        return mapper.toResponse(assessment,
                items.findByAssessment_SessionIdOrderByCriterionCodeAsc(sessionId),
                hasPendingReview(session.getHorse().getHorseId()));
    }

    /** A notification is a mutation: historical recorder scope does not authorize it. */
    @Transactional
    public TrainingVetNotificationResponse manual(String sessionId, String reason) {
        var initial = sessions.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Training session not found"));
        access.requireWrite(initial);
        horses.findByIdForUpdate(initial.getHorse().getHorseId())
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        var assessment = assessments.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("No post-training assessment recorded"));
        access.requireWrite(assessment.getSession());
        if (!"COMPLETED".equals(assessment.getSession().getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_SESSION_STATE",
                    "Complete the session before requesting a vet check.");
        }
        return notifications.requestManual(assessment, reason);
    }
    @Transactional(readOnly = true)
    public boolean hasPendingReview(String horseId) {
        return assessments.existsBySession_Horse_HorseIdAndReviewStatus(
                horseId, TrainingAssessmentReviewStatus.PENDING);
    }

    public void requireNoPendingReview(String horseId) {
        if (hasPendingReview(horseId)) {
            throw new ApiException(HttpStatus.CONFLICT, "PENDING_POST_TRAINING_REVIEW",
                    "Training is paused until a vet review is completed for this horse.");
        }
    }

    @Transactional(readOnly = true)
    public Set<String> pendingHorseIds(Collection<String> horseIds) {
        return horseIds.isEmpty() ? Set.of() : assessments.pendingHorseIds(horseIds);
    }

    /** Batch both metadata and items; never expose assessment details to unapproved read roles. */
    @Transactional(readOnly = true)
    public void enrich(List<TrainingSession> source, List<TrainingSessionResponse> responses) {
        if (source.isEmpty()) return;
        var actor = access.actor();
        Set<String> readableIds = access.readableSessionIds(actor, source);
        Map<String, TrainingSessionAssessment> byId = new HashMap<>();
        Map<String, List<TrainingSessionAssessmentItem>> answers = Map.of();
        if (!readableIds.isEmpty()) {
            for (var assessment : assessments.findAllBySessionIdIn(readableIds)) {
                byId.put(assessment.getSessionId(), assessment);
            }
            if (!byId.isEmpty()) {
                answers = items.findByAssessment_SessionIdIn(byId.keySet()).stream()
                        .collect(Collectors.groupingBy(TrainingSessionAssessmentItem::getSessionId));
            }
        }
        for (var response : responses) {
            var assessment = byId.get(response.getSessionId());
            if (assessment != null) {
                response.setAssessment(mapper.toResponse(assessment,
                        answers.getOrDefault(response.getSessionId(), List.of()),
                        Boolean.TRUE.equals(response.getPendingPostTrainingReview())));
            }
        }
    }
}
