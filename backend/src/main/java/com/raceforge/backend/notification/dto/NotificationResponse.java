package com.raceforge.backend.notification.dto;

import com.raceforge.backend.notification.entity.Notification;
import java.time.Instant;

public record NotificationResponse(
        String notificationId,
        String notificationType,
        String title,
        String message,
        boolean read,
        Instant createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n.getNotificationId(), n.getNotificationType(),
                n.getTitle(), n.getMessage(), n.isRead(), n.getCreatedAt());
    }
}
