package com.raceforge.backend.training.entity;

import com.raceforge.backend.horse.entity.Horse;
import jakarta.persistence.*;
import java.time.LocalDateTime;

// BR-C03: a horse cannot have two sessions at the exact same scheduled_time. This only catches
// an exact-time clash, not a partial time-range overlap — a true overlap-range guard needs a DB
// check constraint/trigger beyond plain JPA, not added here.
@Entity
@Table(name = "training_session",
        uniqueConstraints = @UniqueConstraint(columnNames = {"horse_id", "scheduled_time"}))
public class TrainingSession {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "session_id")
  private Long sessionId;

  @ManyToOne
  @JoinColumn(name = "plan_id", nullable = false)
  private TrainingPlan plan;

  @ManyToOne
  @JoinColumn(name = "horse_id", nullable = false)
  private Horse horse;

  @Column(name = "scheduled_time", nullable = false)
  private LocalDateTime scheduledTime;

  // SCHEDULED, COMPLETED or MISSED. Kept as a plain String to match Horse.status/healthStatus convention.
  @Column(name = "status", nullable = false)
  private String status = "SCHEDULED";

  @Column(name = "performance_notes")
  private String performanceNotes;

  // --- Attendance / performance data, filled when the session is marked COMPLETED or MISSED ---

  @Column(name = "activity_name")
  private String activityName; // e.g. "Endurance run", "Recovery", "Speed work"

  // Only for MISSED: TRAINING_LOCK, HEALTH_ISSUE, INJURY, BAD_WEATHER or OTHER.
  @Column(name = "absence_reason")
  private String absenceReason;

  @Column(name = "absence_note")
  private String absenceNote;

  @Column(name = "heart_rate")
  private Integer heartRate; // bpm after the session

  @Column(name = "avg_speed")
  private Double avgSpeed; // km/h

  @Column(name = "max_speed")
  private Double maxSpeed; // km/h

  // true when avgSpeed dropped more than 35% versus the previous completed session.
  @Column(name = "warning_triggered")
  private Boolean warningTriggered = false;

  @Column(name = "performed_by")
  private Long performedBy;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public TrainingSession() {
  }

  public Long getSessionId() {
      return sessionId;
  }

  public void setSessionId(Long sessionId) {
      this.sessionId = sessionId;
  }

  public TrainingPlan getPlan() {
      return plan;
  }

  public void setPlan(TrainingPlan plan) {
      this.plan = plan;
  }

  public Horse getHorse() {
      return horse;
  }

  public void setHorse(Horse horse) {
      this.horse = horse;
  }

  public LocalDateTime getScheduledTime() {
      return scheduledTime;
  }

  public void setScheduledTime(LocalDateTime scheduledTime) {
      this.scheduledTime = scheduledTime;
  }

  public String getStatus() {
      return status;
  }

  public void setStatus(String status) {
      this.status = status;
  }

  public String getPerformanceNotes() {
      return performanceNotes;
  }

  public void setPerformanceNotes(String performanceNotes) {
      this.performanceNotes = performanceNotes;
  }

  public String getActivityName() {
      return activityName;
  }

  public void setActivityName(String activityName) {
      this.activityName = activityName;
  }

  public String getAbsenceReason() {
      return absenceReason;
  }

  public void setAbsenceReason(String absenceReason) {
      this.absenceReason = absenceReason;
  }

  public String getAbsenceNote() {
      return absenceNote;
  }

  public void setAbsenceNote(String absenceNote) {
      this.absenceNote = absenceNote;
  }

  public Integer getHeartRate() {
      return heartRate;
  }

  public void setHeartRate(Integer heartRate) {
      this.heartRate = heartRate;
  }

  public Double getAvgSpeed() {
      return avgSpeed;
  }

  public void setAvgSpeed(Double avgSpeed) {
      this.avgSpeed = avgSpeed;
  }

  public Double getMaxSpeed() {
      return maxSpeed;
  }

  public void setMaxSpeed(Double maxSpeed) {
      this.maxSpeed = maxSpeed;
  }

  public Boolean getWarningTriggered() {
      return warningTriggered;
  }

  public void setWarningTriggered(Boolean warningTriggered) {
      this.warningTriggered = warningTriggered;
  }

  public Long getPerformedBy() {
      return performedBy;
  }

  public void setPerformedBy(Long performedBy) {
      this.performedBy = performedBy;
  }

  public LocalDateTime getUpdatedAt() {
      return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
      this.updatedAt = updatedAt;
  }
}
