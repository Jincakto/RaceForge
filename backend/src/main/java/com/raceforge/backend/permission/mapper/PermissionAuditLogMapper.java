package com.raceforge.backend.permission.mapper;

import com.raceforge.backend.permission.dto.PermissionAuditLogResponse;
import com.raceforge.backend.permission.entity.PermissionAuditLog;
import org.springframework.stereotype.Component;

@Component
public class PermissionAuditLogMapper {

  public PermissionAuditLogResponse toResponse(PermissionAuditLog log) {
      PermissionAuditLogResponse response = new PermissionAuditLogResponse();

      response.setLogId(log.getLogId());
      response.setAction(log.getAction());
      response.setRoleName(log.getRoleName());
      response.setPermissionCode(log.getPermissionCode());
      response.setPerformedBy(log.getPerformedBy());
      response.setPerformedAt(log.getPerformedAt());

      return response;
  }
}
