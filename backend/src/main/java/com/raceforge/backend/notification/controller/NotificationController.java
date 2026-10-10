package com.raceforge.backend.notification.controller;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.notification.dto.NotificationResponse;
import com.raceforge.backend.notification.entity.Notification;
import com.raceforge.backend.notification.repository.NotificationRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository repository;

    public NotificationController(NotificationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<NotificationResponse> mine(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return repository.findByUserIdOrderByCreatedAtDesc(principal.userId())
                .stream().map(NotificationResponse::from).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return Map.of("unreadCount", repository.countByUserIdAndReadFalse(principal.userId()));
    }

    @PatchMapping("/{id}/read")
    @Transactional
    public NotificationResponse markRead(
            @PathVariable String id,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        Notification notification = repository.findByNotificationIdAndUserId(id, principal.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setRead(true);
        return NotificationResponse.from(repository.save(notification));
    }
}
