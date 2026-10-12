package com.raceforge.backend.audit.service;

import com.raceforge.backend.audit.entity.AuditLog;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import java.time.Instant;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
    private final AuditLogRepository repository;

    public AuditLogService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public AuditLog record(Integer actorId, Integer horseId, String entityType,
                           Integer entityId, String action, String result, String reason) {
        AuditLog log = new AuditLog();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (actorId == null && authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            actorId = user.userId();
        }
        log.setUserId(actorId);
        log.setHorseId(horseId);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setResult(result);
        log.setReason(reason);
        log.setCreatedAt(Instant.now());
        return repository.save(log);
    }
}
