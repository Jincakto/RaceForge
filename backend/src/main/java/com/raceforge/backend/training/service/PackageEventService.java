package com.raceforge.backend.training.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.Trainer;
import java.util.HashSet;
import java.util.Set;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.notification.service.NotificationService;
import org.springframework.stereotype.Service;

@Service
public class PackageEventService {

    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    public PackageEventService(NotificationService notificationService,
                               AuditLogService auditLogService,
                               UserRepository userRepository) {
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
    }

    public void record(Integer actorId, String horseId, Integer entityId,
                       String action, String reason) {
        auditLogService.record(actorId, horseId, "HORSE_PACKAGE", entityId,
                action, "SUCCESS", reason);
    }

    public void notifyOwner(Integer ownerId, String horseId,
                            String type, String message) {
        if (ownerId != null) {
            notificationService.notify(ownerId, type,
                    "Horse package update", "Horse " + horseId + ": " + message);
        }
    }

    /** Existing accepted Head Trainers stay assigned during medical recovery. */
    public void notifyAssignedTrainers(Horse horse, String type, String message) {
        if (horse == null || horse.getTrainers() == null) return;
        Set<Integer> notified = new HashSet<>();
        for (Trainer trainer : horse.getTrainers()) {
            if (trainer != null && trainer.getUser() != null
                    && trainer.getUser().getUserId() != null
                    && notified.add(trainer.getUser().getUserId())) {
                notificationService.notify(trainer.getUser().getUserId(), type,
                        "Horse " + horse.getHorseId() + " training update", message);
            }
        }
    }

    public void notifyManagers(String horseId, String type, String message) {
        for (User manager : userRepository.findActiveManagers()) {
            notificationService.notify(manager.getUserId(), type,
                    "Horse medical/training update", "Horse " + horseId + ": " + message);
        }
    }
}
