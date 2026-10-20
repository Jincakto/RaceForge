package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class ScheduleSessionRequest {

  @NotNull
  private String planId;

  // Optional when the plan has exactly one horse.
<<<<<<< HEAD
  private @jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId;
=======
  private String horseId;
>>>>>>> 76de6e5 (luu code)

  @NotNull
  private LocalDateTime scheduledTime;

  private LocalDateTime scheduledEnd;
  public LocalDateTime getScheduledEnd(){return scheduledEnd;}
  public void setScheduledEnd(LocalDateTime value){scheduledEnd=value;}
  public ScheduleSessionRequest() {
  }

  public String getPlanId() {
      return planId;
  }

  public void setPlanId(String planId) {
      this.planId = planId;
  }

  public LocalDateTime getScheduledTime() {
      return scheduledTime;
  }

  public void setScheduledTime(LocalDateTime scheduledTime) {
      this.scheduledTime = scheduledTime;
  }

  public String getHorseId() {
      return horseId;
  }

<<<<<<< HEAD
  public void setHorseId(@jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId) {
=======
  public void setHorseId(String horseId) {
>>>>>>> 76de6e5 (luu code)
      this.horseId = horseId;
  }
}
