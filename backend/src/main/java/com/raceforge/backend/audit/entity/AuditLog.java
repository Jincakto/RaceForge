package com.raceforge.backend.audit.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Audit_Log")
public class AuditLog extends com.raceforge.backend.common.id.BusinessEntity {

    @Id
    @Column(name = "audit_id")
    private String auditId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "horse_id")
    private String horseId;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", length = 100)
    private String entityType;

    @Column(name = "entity_id")
    private String entityId;

    @Column(name = "result", length = 50)
    private String result;

    @Column(name = "reason", length = 1000)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

   
    public String getAuditId() {
        return auditId;
    }
    
    public void setAuditId(String auditId) {
        this.auditId = auditId;
    }
    
    public String getUserId() {
        return userId;
    }
    
<<<<<<< HEAD
    public void setUserId(Object userId) {
        this.userId = userId == null ? null : userId.toString();
=======
    public void setUserId(String userId) {
        this.userId = userId;
>>>>>>> 76de6e5 (luu code)
    }
    
    public String getHorseId() {
        return horseId;
    }
    
<<<<<<< HEAD
    public void setHorseId(Object horseId) {
        this.horseId = horseId == null ? null : horseId.toString();
=======
    public void setHorseId(String horseId) {
        this.horseId = horseId;
>>>>>>> 76de6e5 (luu code)
    }
    
    public String getAction() {
        return action;
    }
    
    public void setAction(String action) {
        this.action = action;
    }
    
    public String getEntityType() {
        return entityType;
    }
    
    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }
    
    public String getEntityId() {
        return entityId;
    }
    
<<<<<<< HEAD
    public void setEntityId(Object entityId) {
        this.entityId = entityId == null ? null : entityId.toString();
=======
    public void setEntityId(String entityId) {
        this.entityId = entityId;
>>>>>>> 76de6e5 (luu code)
    }
    
    public String getResult() {
        return result;
    }
    
    public void setResult(String result) {
        this.result = result;
    }
    
    public String getReason() {
        return reason;
    }
    
    public void setReason(String reason) {
        this.reason = reason;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

}
