
package com.raceforge.backend.notification.repository;

import com.raceforge.backend.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Notification> findByNotificationIdAndUserId(
            Integer notificationId,
            String userId
    );

    long countByUserIdAndReadFalse(String userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false AND n.createdAt <= :cutoff")
    int markAllRead(@Param("userId") String userId, @Param("cutoff") Instant cutoff);
}
