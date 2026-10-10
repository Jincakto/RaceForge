package com.raceforge.backend.notification.service;

import com.raceforge.backend.common.util.IdGenerator;
import com.raceforge.backend.notification.entity.Notification;
import com.raceforge.backend.notification.repository.NotificationRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public void notify(String userId, String type, String title, String message) {
        Notification notification = new Notification();
        notification.setNotificationId(IdGenerator.prefixed("NTF", 20));
        notification.setUserId(userId);
        notification.setNotificationType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRead(false);
        notification.setCreatedAt(Instant.now());
        notificationRepository.save(notification);
    }
}
