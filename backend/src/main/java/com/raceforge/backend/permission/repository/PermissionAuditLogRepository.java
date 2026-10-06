package com.raceforge.backend.permission.repository;

import com.raceforge.backend.permission.entity.PermissionAuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionAuditLogRepository extends JpaRepository<PermissionAuditLog, Long> {

  List<PermissionAuditLog> findByRoleNameOrderByPerformedAtDesc(String roleName);
}
