package com.raceforge.backend.training.entity;

import com.raceforge.backend.horse.entity.Horse;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// Maps to table Training_Session. (plan_id, horse_id) is a composite FK to Horse_Plan in the DB,
// so a session can only be created for a horse that has been attached to the plan.
// BR-C03 is checked by the service and the unique index UX_TrainingSession_HorseStart.
@Entity
@Table(name = "Training_Session")
public class TrainingSession {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "session_id")
  private Integer sessionId;

  @ManyToOne
  @JoinColumn(name = "plan_id", nullable = false)
  private TrainingPlan plan;

  @ManyToOne
  @JoinColumn(name = "horse_id", nullable = false)
  private Horse horse;

  @Column(name = "scheduled_start", nullable = false)
  private LocalDateTime scheduledStart;

  @Column(name = "scheduled_end")
  private LocalDateTime scheduledEnd;

  @Column(name = "distance", precision = 8, scale = 2)
  private BigDecimal distance;

  @Column(name = "heart_rate")
  private Integer heartRate;
  @Column(name = "avg_speed")
  private Double avgSpeed;
  @Column(name = "max_speed")
  private Double maxSpeed;
  @Column(name = "recorded_by")
  private String recordedBy;

  public Integer getHeartRate() { return heartRate; }
  public void setHeartRate(Integer value) { heartRate = value; }
  public Double getAvgSpeed() { return avgSpeed; }
  public void setAvgSpeed(Double value) { avgSpeed = value; }
  public Double getMaxSpeed() { return maxSpeed; }
  public void setMaxSpeed(Double value) { maxSpeed = value; }
  public String getRecordedBy() { return recordedBy; }
  public void setRecordedBy(String value) { recordedBy = value; }

  @Column(name = "intensity", length = 30)
  private String intensity;

  @Column(name = "surface", length = 100)
  private String surface;

  // SCHEDULED, COMPLETED or MISSED.
  @Column(name = "status", nullable = false, length = 20)
  private String status = "SCHEDULED";

  @Column(name = "actual_start")
  private LocalDateTime actualStart;

  @Column(name = "actual_end")
  private LocalDateTime actualEnd;

  @Column(name = "evaluation", length = 1000)
  private String evaluation;

  @Column(name = "notes", length = 1000)
  private String notes;

  public TrainingSession() {
  }

  public Integer getSessionId() {
      return sessionId;
  }

  public void setSessionId(Integer sessionId) {
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

  public LocalDateTime getScheduledStart() {
      return scheduledStart;
  }

  public void setScheduledStart(LocalDateTime scheduledStart) {
      this.scheduledStart = scheduledStart;
  }

  public LocalDateTime getScheduledEnd() {
      return scheduledEnd;
  }

  public void setScheduledEnd(LocalDateTime scheduledEnd) {
      this.scheduledEnd = scheduledEnd;
  }

  public BigDecimal getDistance() {
      return distance;
  }

  public void setDistance(BigDecimal distance) {
      this.distance = distance;
  }

  public String getIntensity() {
      return intensity;
  }

  public void setIntensity(String intensity) {
      this.intensity = intensity;
  }

  public String getSurface() {
      return surface;
  }

  public void setSurface(String surface) {
      this.surface = surface;
  }

  public String getStatus() {
      return status;
  }

  public void setStatus(String status) {
      this.status = status;
  }

  public LocalDateTime getActualStart() {
      return actualStart;
  }

  public void setActualStart(LocalDateTime actualStart) {
      this.actualStart = actualStart;
  }

  public LocalDateTime getActualEnd() {
      return actualEnd;
  }

  public void setActualEnd(LocalDateTime actualEnd) {
      this.actualEnd = actualEnd;
  }

  public String getEvaluation() {
      return evaluation;
  }

  public void setEvaluation(String evaluation) {
      this.evaluation = evaluation;
  }

  public String getNotes() {
      return notes;
  }

  public void setNotes(String notes) {
      this.notes = notes;
  }
}
