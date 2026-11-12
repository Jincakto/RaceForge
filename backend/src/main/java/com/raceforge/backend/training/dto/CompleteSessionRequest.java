package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public class CompleteSessionRequest {
  @jakarta.validation.Valid
  @jakarta.validation.constraints.NotNull(groups = CompletionRequired.class)
  @io.swagger.v3.oas.annotations.media.Schema(description = "All ten post-training answers are required when completing a session; no individual concern note is required. Not required for MISSED attendance.")
  private TrainingAssessmentRequest assessment;
  public TrainingAssessmentRequest getAssessment() { return assessment; }
  public void setAssessment(TrainingAssessmentRequest value) { assessment = value; }


  private java.math.BigDecimal distance;
  public java.math.BigDecimal getDistance(){return distance;}
  public void setDistance(java.math.BigDecimal value){distance=value;}

  @Size(max = 1000)
  @io.swagger.v3.oas.annotations.media.Schema(description = "Optional overall notes for the completed session, up to 1,000 characters.", requiredMode = io.swagger.v3.oas.annotations.media.Schema.RequiredMode.NOT_REQUIRED)
  private String performanceNotes;
  @PositiveOrZero
  private Double avgSpeed;
  @PositiveOrZero
  private Double maxSpeed;

  // Speeds: km/h. Required fields are checked on completion only.
  public Double getAvgSpeed() { return avgSpeed; }
  public void setAvgSpeed(Double value) { avgSpeed = value; }
  public Double getMaxSpeed() { return maxSpeed; }
  public void setMaxSpeed(Double value) { maxSpeed = value; }

  public CompleteSessionRequest() {
  }

  public String getPerformanceNotes() {
      return performanceNotes;
  }

  public void setPerformanceNotes(String performanceNotes) {
      this.performanceNotes = performanceNotes;
  }
}
