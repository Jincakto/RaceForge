package com.raceforge.backend.permission.dto;

import java.time.LocalDateTime;

public class PermissionAuditLogResponse {

  private Long logId;
  private String action;
  private String roleName;
  private String permissionCode;
  private Long performedBy;
  private LocalDateTime performedAt;

  public PermissionAuditLogResponse() {
  }

  public Long getLogId() {
      return logId;
  }

  public void setLogId(Long logId) {
      this.logId = logId;
  }

  public String getAction() {
      return action;
  }

  public void setAction(String action) {
      this.action = action;
  }

  public String getRoleName() {
      return roleName;
  }

  public void setRoleName(String roleName) {
      this.roleName = roleName;
  }

  public String getPermissionCode() {
      return permissionCode;
  }

  public void setPermissionCode(String permissionCode) {
      this.permissionCode = permissionCode;
  }

  public Long getPerformedBy() {
      return performedBy;
  }

  public void setPerformedBy(Long performedBy) {
      this.performedBy = performedBy;
  }

  public LocalDateTime getPerformedAt() {
      return performedAt;
  }

  public void setPerformedAt(LocalDateTime performedAt) {
      this.performedAt = performedAt;
  }
}
