package com.raceforge.backend.horse.entity;

import com.raceforge.backend.account.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Shared assignment request for VET or TRAINER; maps to the agreed schema. */
@Entity
@Table(name = "Horse_Assignment")
public class HorseAssignment {
    @Id
    @Column(name = "id")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "horse_id", nullable = false)
    private Horse horse;

    @Column(name = "kind", nullable = false, length = 10)
    private String kind; // VET or TRAINER

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assigned_by", nullable = false)
    private User assignedBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignee_id", nullable = false)
    private User assignee;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ASSIGNED";

    @Column(name = "reason", length = 1000)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // RespondedAt means accepting or declining, not completing or reassigning.
    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    // Stored as text until Medical_Record PK is migrated from Integer to VARCHAR.
    @Column(name = "medical_record_id", length = 20)
    private String medicalRecordId;

    @PrePersist
    void initialize() { if (createdAt == null) createdAt = LocalDateTime.now(); }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Horse getHorse() { return horse; }
    public void setHorse(Horse horse) { this.horse = horse; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public User getAssignedBy() { return assignedBy; }
    public void setAssignedBy(User assignedBy) { this.assignedBy = assignedBy; }
    public User getAssignee() { return assignee; }
    public void setAssignee(User assignee) { this.assignee = assignee; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(LocalDateTime respondedAt) { this.respondedAt = respondedAt; }
    public String getMedicalRecordId() { return medicalRecordId; }
    public void setMedicalRecordId(String medicalRecordId) { this.medicalRecordId = medicalRecordId; }
}
