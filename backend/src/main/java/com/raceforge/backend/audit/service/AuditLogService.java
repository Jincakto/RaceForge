package com.raceforge.backend.audit.service;

import com.raceforge.backend.audit.entity.AuditLog;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
    private final AuditLogRepository repository;

    public AuditLogService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public AuditLog record(String actorId, String horseId, String entityType,
                           Object entityId, String action, String result, String reason) {
        AuditLog log = new AuditLog();
        log.setUserId(actorId);
        log.setHorseId(horseId);
        log.setEntityType(entityType);
        log.setEntityId(entityId == null ? null : entityId.toString());
        log.setAction(action);
        log.setResult(result);
        log.setReason(reason);
        return repository.save(log);
    }
}
