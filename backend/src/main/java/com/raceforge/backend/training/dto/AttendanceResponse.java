package com.raceforge.backend.training.dto;

public class AttendanceResponse {

  private TrainingSessionResponse session;
  private boolean warningTriggered;
  private String warningMessage;

  public AttendanceResponse() {
  }

  public AttendanceResponse(TrainingSessionResponse session, boolean warningTriggered, String warningMessage) {
      this.session = session;
      this.warningTriggered = warningTriggered;
      this.warningMessage = warningMessage;
  }

  public TrainingSessionResponse getSession() {
      return session;
  }

  public void setSession(TrainingSessionResponse session) {
      this.session = session;
  }

  public boolean isWarningTriggered() {
      return warningTriggered;
  }

  public void setWarningTriggered(boolean warningTriggered) {
      this.warningTriggered = warningTriggered;
  }

  public String getWarningMessage() {
      return warningMessage;
  }

  public void setWarningMessage(String warningMessage) {
      this.warningMessage = warningMessage;
  }
}
