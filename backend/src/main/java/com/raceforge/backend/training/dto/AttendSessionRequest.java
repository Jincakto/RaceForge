package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AttendSessionRequest extends CompleteSessionRequest {

  // "COMPLETED" or "MISSED"
  @NotBlank
  private String status;

  // MISSED only: TRAINING_LOCK, HEALTH_ISSUE, INJURY, BAD_WEATHER or OTHER
  @Size(max = 100)
  private String absenceReason;
  @Size(max = 1000)
  private String absenceNote;

  // Compatibility only. Actor identity is taken from the authenticated principal.
  private Integer performedBy;

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

  public Integer getPerformedBy() {
      return performedBy;
  }

  public void setPerformedBy(Integer performedBy) {
      this.performedBy = performedBy;
  }
}
