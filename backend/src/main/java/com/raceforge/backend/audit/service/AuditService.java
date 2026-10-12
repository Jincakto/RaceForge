package com.raceforge.backend.audit.service;

import com.raceforge.backend.audit.entity.AuditLog;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(Integer actorUserId, String action, String entityType, Integer entityId, String result, String reason) {
        AuditLog log = new AuditLog();
        log.setUserId(actorUserId);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setResult(result);
        log.setReason(reason);
        log.setCreatedAt(LocalDateTime.now());
        auditLogRepository.save(log);
    }
}
