package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class ScheduleSessionRequest {

  @NotNull
  private Long planId;

  @NotNull
  private LocalDateTime scheduledTime;

  public ScheduleSessionRequest() {
  }

  public Long getPlanId() {
      return planId;
  }

  public void setPlanId(Long planId) {
      this.planId = planId;
  }

  public LocalDateTime getScheduledTime() {
      return scheduledTime;
  }

  public void setScheduledTime(LocalDateTime scheduledTime) {
      this.scheduledTime = scheduledTime;
  }
}
