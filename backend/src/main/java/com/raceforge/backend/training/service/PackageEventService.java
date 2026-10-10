package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.entity.AuditLog;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import com.raceforge.backend.common.util.IdGenerator;
import com.raceforge.backend.notification.service.NotificationService;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class PackageEventService {

    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public PackageEventService(NotificationService notificationService,
                               AuditLogRepository auditLogRepository,
                               UserRepository userRepository) {
        this.notificationService = notificationService;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    public void record(String actorId, String horseId, String entityId,
                       String action, String reason) {
        AuditLog log = new AuditLog();
        log.setAuditId(IdGenerator.prefixed("AUD", 20));
        log.setUserId(actorId);
        log.setHorseId(horseId);
        log.setEntityType("HORSE_PACKAGE");
        log.setEntityId(entityId);
        log.setAction(action);
        log.setResult("SUCCESS");
        log.setReason(reason);
        log.setCreatedAt(Instant.now());
        auditLogRepository.save(log);
    }

    public void notifyOwner(String ownerId, String horseId,
                            String type, String message) {
        if (ownerId != null && !ownerId.isBlank()) {
            notificationService.notify(ownerId, type,
                    "Horse package update", "Horse " + horseId + ": " + message);
        }
    }

    public void notifyManagers(String horseId, String type, String message) {
        for (User manager : userRepository.findActiveManagers()) {
            notificationService.notify(manager.getUserId(), type,
                    "Horse medical/training update", "Horse " + horseId + ": " + message);
        }
    }
}
