package com.raceforge.backend.permission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// Maps to the existing table Audit_Log. A grant/revoke is stored as:
//   action = "GRANT" | "REVOKE", entity_type = "ROLE_PERMISSION",
//   entity_id = role_id, reason = permission_name, user_id = who did it.
@Entity
@Table(name = "Audit_Log")
public class PermissionAuditLog {

  public static final String ENTITY_TYPE = "ROLE_PERMISSION";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "audit_id")
  private Integer auditId;

  @Column(name = "user_id", length = 20)
  private String userId;

  @Column(name = "action", nullable = false, length = 100)
  private String action;

  @Column(name = "entity_type", length = 100)
  private String entityType;

  @Column(name = "entity_id", length = 20)
  private String entityId;

  @Column(name = "result", length = 50)
  private String result;

  @Column(name = "reason", length = 1000)
  private String reason;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public PermissionAuditLog() {
  }

  public Integer getAuditId() { return auditId; }
  public void setAuditId(Integer auditId) { this.auditId = auditId; }
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public String getAction() { return action; }
  public void setAction(String action) { this.action = action; }
  public String getEntityType() { return entityType; }
  public void setEntityType(String entityType) { this.entityType = entityType; }
  public String getEntityId() { return entityId; }
  public void setEntityId(String entityId) { this.entityId = entityId; }
  public String getResult() { return result; }
  public void setResult(String result) { this.result = result; }
  public String getReason() { return reason; }
  public void setReason(String reason) { this.reason = reason; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
