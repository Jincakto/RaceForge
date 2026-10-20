package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public class CompleteSessionRequest {

  private java.math.BigDecimal distance;
  public java.math.BigDecimal getDistance(){return distance;}
  public void setDistance(java.math.BigDecimal value){distance=value;}

  private Integer endExerciseHeartRate;
  public Integer getEndExerciseHeartRate(){return endExerciseHeartRate;}
  public void setEndExerciseHeartRate(Integer value){endExerciseHeartRate=value;}

  private Integer recoveryHeartRate2Min;
  public Integer getRecoveryHeartRate2Min(){return recoveryHeartRate2Min;}
  public void setRecoveryHeartRate2Min(Integer value){recoveryHeartRate2Min=value;}

  private java.time.LocalDateTime recoveryMeasuredAt;
  public java.time.LocalDateTime getRecoveryMeasuredAt(){return recoveryMeasuredAt;}
  public void setRecoveryMeasuredAt(java.time.LocalDateTime value){recoveryMeasuredAt=value;}

  @Size(max = 1000)
  private String performanceNotes;
  @Positive
  private Integer heartRate;
  @PositiveOrZero
  private Double avgSpeed;
  @PositiveOrZero
  private Double maxSpeed;

  // Heart rate: bpm. Speeds: km/h. Required fields are checked on completion only.
  public Integer getHeartRate() { return heartRate; }
  public void setHeartRate(Integer value) { heartRate = value; }
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
