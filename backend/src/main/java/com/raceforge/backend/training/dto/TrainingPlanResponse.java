package com.raceforge.backend.training.dto;

import java.time.LocalDateTime;

public class TrainingPlanResponse {

  private Long planId;
  private Long horseId;
  private Long createdByTrainerId;
  private String description;
  private LocalDateTime createdAt;

  public TrainingPlanResponse() {
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

  public Long getCreatedByTrainerId() {
      return createdByTrainerId;
  }

  public void setCreatedByTrainerId(Long createdByTrainerId) {
      this.createdByTrainerId = createdByTrainerId;
  }

  public String getDescription() {
      return description;
  }

  public void setDescription(String description) {
      this.description = description;
  }

  public LocalDateTime getCreatedAt() {
      return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
      this.createdAt = createdAt;
  }
}
