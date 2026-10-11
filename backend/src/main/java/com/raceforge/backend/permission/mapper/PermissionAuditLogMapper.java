package com.raceforge.backend.permission.mapper;

import com.raceforge.backend.permission.dto.PermissionAuditLogResponse;
import com.raceforge.backend.permission.entity.PermissionAuditLog;
import org.springframework.stereotype.Component;

@Component
public class PermissionAuditLogMapper {

  public PermissionAuditLogResponse toResponse(PermissionAuditLog log, String roleName) {
      PermissionAuditLogResponse response = new PermissionAuditLogResponse();

      response.setLogId(log.getAuditId());
      response.setAction(log.getAction());
      response.setRoleName(roleName);
      response.setPermissionCode(log.getReason()); // reason holds the permission_name
      response.setPerformedBy(log.getUserId());
      response.setPerformedAt(log.getCreatedAt());

      return response;
  }
}
