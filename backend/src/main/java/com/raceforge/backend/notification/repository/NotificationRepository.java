package com.raceforge.backend.notification.repository;

import com.raceforge.backend.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, String> {
}
