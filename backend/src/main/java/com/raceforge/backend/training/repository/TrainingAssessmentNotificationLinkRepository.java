package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingAssessmentNotificationLink;
import com.raceforge.backend.training.entity.TrainingAssessmentNotificationStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingAssessmentNotificationLinkRepository
        extends JpaRepository<TrainingAssessmentNotificationLink, String> {
    @EntityGraph(attributePaths = {"assessment", "assessment.session", "assessment.session.horse", "assessment.session.plan"})
    Optional<TrainingAssessmentNotificationLink> findByNotificationId(Integer notificationId);

    boolean existsByAssessment_SessionIdAndRecipientIdAndNotificationType(
            String sessionId, String recipientId, String notificationType);

    default boolean existsBySessionIdAndRecipientIdAndNotificationType(
            String sessionId, String recipientId, String notificationType) {
        return existsByAssessment_SessionIdAndRecipientIdAndNotificationType(sessionId, recipientId, notificationType);
    }

    @EntityGraph(attributePaths = {"assessment"})
    List<TrainingAssessmentNotificationLink> findByAssessment_SessionId(String sessionId);

    @EntityGraph(attributePaths = {"assessment"})
    List<TrainingAssessmentNotificationLink> findByAssessment_SessionIdIn(Collection<String> sessionIds);

    @EntityGraph(attributePaths = {"assessment", "assessment.session", "assessment.session.horse"})
    List<TrainingAssessmentNotificationLink> findByAssessment_Session_Horse_HorseIdAndDeliveryStatus(
            String horseId, TrainingAssessmentNotificationStatus deliveryStatus);
}
