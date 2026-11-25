package com.raceforge.backend.horse.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** One current admission state per horse; past decisions are in Audit_Log. */
@Entity
@Table(name = "Horse_Admission")
public class HorseAdmission {
    @Id
    @Column(name = "horse_id", length = 20)
    private String horseId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "horse_id")
    private Horse horse;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "NOT_SUBMITTED";

    @Column(name = "screening_status", nullable = false, length = 30)
    private String screeningStatus = "PENDING";
    @Column(name = "screened_by", length = 20)
    private String screenedBy;
    @Column(name = "screened_at")
    private LocalDateTime screenedAt;
    // Public instructions for the owner, never an external verification report.
    @Column(name = "screening_reason", length = 1000)
    private String screeningReason;
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime value) { submittedAt = value; }

    public String getScreeningStatus() { return screeningStatus; }
    public void setScreeningStatus(String value) { screeningStatus = value; }
    public String getScreenedBy() { return screenedBy; }
    public void setScreenedBy(String value) { screenedBy = value; }
    public LocalDateTime getScreenedAt() { return screenedAt; }
    public void setScreenedAt(LocalDateTime value) { screenedAt = value; }
    public String getScreeningReason() { return screeningReason; }
    public void setScreeningReason(String value) { screeningReason = value; }

    public void resetScreening() {
        screeningStatus = "PENDING";
        screenedBy = null;
        screenedAt = null;
        screeningReason = null;
    }

    // These columns are VARCHAR(20) in the agreed DB. Do not add duplicate
    // medical/user entities here until their IDs are synchronized to String.
    @Column(name = "medical_record_id", length = 20)
    private String medicalRecordId;

    @Column(name = "decision_by", length = 20)
    private String decisionBy;

    @Column(name = "decision_reason", length = 1000)
    private String decisionReason;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public String getHorseId() { return horseId; }
    public void setHorseId(String horseId) { this.horseId = horseId; }
    public Horse getHorse() { return horse; }
    public void setHorse(Horse horse) { this.horse = horse; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMedicalRecordId() { return medicalRecordId; }
    public void setMedicalRecordId(String id) { this.medicalRecordId = id; }
    public String getDecisionBy() { return decisionBy; }
    public void setDecisionBy(String id) { this.decisionBy = id; }
    public String getDecisionReason() { return decisionReason; }
    public void setDecisionReason(String reason) { this.decisionReason = reason; }
    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime time) { this.decidedAt = time; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
