package com.raceforge.backend.audit.service;

import com.raceforge.backend.audit.entity.AuditLog;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
    private final AuditLogRepository repository;

    public AuditLogService(AuditLogRepository repository) { this.repository = repository; }

    /** Temporary bridge: callers still use both Integer and String IDs during migration.
     *  The final schema stores user_id, horse_id, entity_id as VARCHAR(20).
     */
    @Transactional
<<<<<<< HEAD
    public AuditLog record(Object actorId, Object horseId, String entityType,
                           Object entityId, String action, String result, String reason) {
=======
    public AuditLog record(String actorId, String horseId, String entityType,
                           String entityId, String action, String result, String reason) {
>>>>>>> 76de6e5 (luu code)
        AuditLog log = new AuditLog();
        log.setUserId(actorId);
        log.setHorseId(horseId);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setResult(result);
        log.setReason(reason);
        return repository.save(log);
    }
}
