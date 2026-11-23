package com.raceforge.backend.permission.mapper;

import com.raceforge.backend.permission.dto.PermissionAuditLogResponse;
import com.raceforge.backend.permission.entity.PermissionAuditLog;
import org.springframework.stereotype.Component;

@Component
public class PermissionAuditLogMapper {

  public PermissionAuditLogResponse toResponse(PermissionAuditLog log, String roleName) {
      PermissionAuditLogResponse response = new PermissionAuditLogResponse();

      response.setLogId(log.getAuditId() == null ? null : log.getAuditId().toString());
      response.setAction(log.getAction());
      response.setRoleName(roleName);
      // Older rows have only the permission code; newer rows append the Admin reason.
      String detail = log.getReason();
      int separator = detail == null ? -1 : detail.indexOf(" | ");
      response.setPermissionCode(separator < 0 ? detail : detail.substring(0, separator));
      response.setReason(separator < 0 ? null : detail.substring(separator + 3));
      response.setPerformedBy(log.getUserId());
      response.setPerformedAt(log.getCreatedAt());

      return response;
  }
}
