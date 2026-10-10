package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AttendSessionRequest {

  // "COMPLETED" or "MISSED"
  @NotBlank
  private String status;

  // MISSED only: TRAINING_LOCK, HEALTH_ISSUE, INJURY, BAD_WEATHER or OTHER
  private String absenceReason;
  private String absenceNote;

  // COMPLETED only. avgSpeed is required for COMPLETED (needed for the speed-drop warning).
  private Integer heartRate;
  private Double avgSpeed;
  private Double maxSpeed;

  @NotNull
  private Long performedBy;

  public AttendSessionRequest() {
  }

  public String getStatus() {
      return status;
  }

  public void setStatus(String status) {
      this.status = status;
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

  public Long getPerformedBy() {
      return performedBy;
  }

  public void setPerformedBy(Long performedBy) {
      this.performedBy = performedBy;
  }
}
