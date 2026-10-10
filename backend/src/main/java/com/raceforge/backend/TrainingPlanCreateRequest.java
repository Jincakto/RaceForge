package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TrainingPlanCreateRequest {

  @NotNull
  private Long trainerId;

  @NotBlank
  private String description;

  public TrainingPlanCreateRequest() {
  }

  public Long getTrainerId() {
      return trainerId;
  }

  public void setTrainerId(Long trainerId) {
      this.trainerId = trainerId;
  }

  public String getDescription() {
      return description;
  }

  public void setDescription(String description) {
      this.description = description;
  }
}
