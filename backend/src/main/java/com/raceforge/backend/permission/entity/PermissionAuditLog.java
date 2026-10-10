package com.raceforge.backend.permission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// Append-only: a RolePermission row gets deleted on revoke, so without this table that event
// would leave no trace. One row per grant AND per revoke — never updated, never deleted.
@Entity
@Table(name = "permission_audit_log")
public class PermissionAuditLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "log_id")
  private Long logId;

  @Column(name = "action", nullable = false)
  private String action; // "GRANT" or "REVOKE"

  @Column(name = "role_name", nullable = false)
  private String roleName;

  @Column(name = "permission_code", nullable = false)
  private String permissionCode;

  @Column(name = "performed_by", nullable = false)
  private Long performedBy;

  @Column(name = "performed_at", nullable = false)
  private LocalDateTime performedAt;

  public PermissionAuditLog() {
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
