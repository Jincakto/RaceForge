package com.raceforge.backend.training.dto;

public class CompleteSessionRequest {

  private String performanceNotes;

  public CompleteSessionRequest() {
  }

  public String getPerformanceNotes() {
      return performanceNotes;
  }

  public void setPerformanceNotes(String performanceNotes) {
      this.performanceNotes = performanceNotes;
  }
}
