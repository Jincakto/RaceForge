package com.raceforge.backend.training.dto;

import java.time.LocalDateTime;

public class TrainingSessionResponse {

  private Long sessionId;
  private Long planId;
  private Long horseId;
  private LocalDateTime scheduledTime;
  private String status;
  private String performanceNotes;
  private String activityName;
  private String absenceReason;
  private String absenceNote;
  private Integer heartRate;
  private Double avgSpeed;
  private Double maxSpeed;
  private Boolean warningTriggered;
  private Long performedBy;
  private LocalDateTime updatedAt;

  public TrainingSessionResponse() {
  }

  public Long getSessionId() {
      return sessionId;
  }

  public void setSessionId(Long sessionId) {
      this.sessionId = sessionId;
  }

  public Long getPlanId() {
      return planId;
  }

  public void setPlanId(Long planId) {
      this.planId = planId;
  }

  public Long getHorseId() {
      return horseId;
  }

  public void setHorseId(Long horseId) {
      this.horseId = horseId;
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
