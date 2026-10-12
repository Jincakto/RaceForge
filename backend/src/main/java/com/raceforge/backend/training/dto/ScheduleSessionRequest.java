package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class ScheduleSessionRequest {

  @NotNull
  private Integer planId;

  // Optional when the plan has exactly one horse.
  private Integer horseId;

  @NotNull
  private LocalDateTime scheduledTime;

  public ScheduleSessionRequest() {
  }

  public Integer getPlanId() {
      return planId;
  }

  public void setPlanId(Integer planId) {
      this.planId = planId;
  }

  public LocalDateTime getScheduledTime() {
      return scheduledTime;
  }

  public void setScheduledTime(LocalDateTime scheduledTime) {
      this.scheduledTime = scheduledTime;
  }

  public Integer getHorseId() {
      return horseId;
  }

  public void setHorseId(Integer horseId) {
      this.horseId = horseId;
  }
}
