package com.raceforge.backend.audit.service;

import com.raceforge.backend.audit.entity.AuditLog;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import com.raceforge.backend.common.util.IdGenerator;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(String actorUserId, String action, String entityType, String entityId, String result, String reason) {
        AuditLog log = new AuditLog();
        log.setAuditId(IdGenerator.prefixed("AUD", 20));
        log.setUserId(actorUserId);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setResult(result);
        log.setReason(reason);
        log.setCreatedAt(Instant.now());
        auditLogRepository.save(log);
    }
}
