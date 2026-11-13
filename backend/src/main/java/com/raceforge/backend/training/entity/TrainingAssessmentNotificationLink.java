package com.raceforge.backend.training.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Technical notification delivery/linkage, never a separate examination queue.
 * A waiting manual request can exist while its assessment remains NOT_REQUIRED.
 */
@Entity
@Table(name = "Training_Assessment_Notification_Link", uniqueConstraints = {
        @UniqueConstraint(name = "UK_TrainingAssessmentNotification_RecipientType",
                columnNames = {"session_id", "recipient_id", "notification_type"})
})
public class TrainingAssessmentNotificationLink {
    @Id
    @Column(name = "link_id", length = 36, updatable = false)
    private String linkId = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private TrainingSessionAssessment assessment;

    @Column(name = "notification_id")
    private Integer notificationId;

    // Null only for a durable request waiting for a current veterinarian.
    @Column(name = "recipient_id", length = 20)
    private String recipientId;

    @Column(name = "notification_type", nullable = false, length = 50)
    private String notificationType;

    @Column(name = "source", nullable = false, length = 10)
    private String source;

    @Column(name = "reason", length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status", nullable = false, length = 40)
    private TrainingAssessmentNotificationStatus deliveryStatus;

    @JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    public TrainingAssessmentNotificationLink() {
    }

    public String getLinkId() { return linkId; }
    public void setLinkId(String value) { linkId = value; }
    public TrainingSessionAssessment getAssessment() { return assessment; }
    public void setAssessment(TrainingSessionAssessment value) { assessment = value; }
    public String getSessionId() { return assessment == null ? null : assessment.getSessionId(); }
    public Integer getNotificationId() { return notificationId; }
    public void setNotificationId(Integer value) { notificationId = value; }
    public String getRecipientId() { return recipientId; }
    public void setRecipientId(String value) { recipientId = value; }
    public String getNotificationType() { return notificationType; }
    public void setNotificationType(String value) { notificationType = value; }
    public String getSource() { return source; }
    public void setSource(String value) { source = value; }
    public String getReason() { return reason; }
    public void setReason(String value) { reason = value; }
    public TrainingAssessmentNotificationStatus getDeliveryStatus() { return deliveryStatus; }
    public void setDeliveryStatus(TrainingAssessmentNotificationStatus value) { deliveryStatus = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime value) { createdAt = value; }
    public LocalDateTime getRequestedAt() { return createdAt; }
    public void setRequestedAt(LocalDateTime value) { createdAt = value; }
    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime value) { sentAt = value; }
}
