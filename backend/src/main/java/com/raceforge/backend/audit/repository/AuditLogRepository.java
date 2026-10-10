package com.raceforge.backend.audit.repository;

import com.raceforge.backend.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
}
