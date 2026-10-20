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

<<<<<<< HEAD
    public void record(String actorUserId, String action, String entityType, Object entityId, String result, String reason) {
=======
    public void record(String actorUserId, String action, String entityType, String entityId, String result, String reason) {
>>>>>>> 76de6e5 (luu code)
        AuditLog log = new AuditLog();
        log.setUserId(actorUserId);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId == null ? null : entityId.toString());
        log.setResult(result);
        log.setReason(reason);
        log.setCreatedAt(LocalDateTime.now());
        auditLogRepository.save(log);
    }
}
