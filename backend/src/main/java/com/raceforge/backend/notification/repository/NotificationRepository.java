
package com.raceforge.backend.notification.repository;

import com.raceforge.backend.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Notification> findByNotificationIdAndUserId(
<<<<<<< HEAD
            Integer notificationId,
=======
            String notificationId,
>>>>>>> 76de6e5 (luu code)
            String userId
    );

    long countByUserIdAndReadFalse(String userId);
}
