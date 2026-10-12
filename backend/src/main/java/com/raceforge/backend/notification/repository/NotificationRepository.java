package com.raceforge.backend.notification.repository;

import com.raceforge.backend.notification.entity.Notification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Integer userId);

    Optional<Notification> findByNotificationIdAndUserId(Integer notificationId, Integer userId);

    long countByUserIdAndReadFalse(Integer userId);
}
