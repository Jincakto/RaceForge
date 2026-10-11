package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class TrainingPlanCreateRequest {

  // User id (INT) of the trainer creating the plan -> Training_Plan.created_by
  @NotNull
  private Integer trainerId;

  // Training_Plan.plan_name (NOT NULL)
  @NotBlank
  private String planName;

  private String goal;
  private Integer duration;
  private String notes;

  // Horse_Plan.start_date / end_date for the horse this plan is created for
  private LocalDate startDate;
  private LocalDate endDate;

  public TrainingPlanCreateRequest() {
  }

  public Integer getTrainerId() {
      return trainerId;
  }

  public void setTrainerId(Integer trainerId) {
      this.trainerId = trainerId;
  }

  public String getPlanName() {
      return planName;
  }

  public void setPlanName(String planName) {
      this.planName = planName;
  }

  public String getGoal() {
      return goal;
  }

  public void setGoal(String goal) {
      this.goal = goal;
  }

  public Integer getDuration() {
      return duration;
  }

  public void setDuration(Integer duration) {
      this.duration = duration;
  }

  public String getNotes() {
      return notes;
  }

  public void setNotes(String notes) {
      this.notes = notes;
  }

  public LocalDate getStartDate() {
      return startDate;
  }

  public void setStartDate(LocalDate startDate) {
      this.startDate = startDate;
  }

  public LocalDate getEndDate() {
      return endDate;
  }

  public void setEndDate(LocalDate endDate) {
      this.endDate = endDate;
  }
}
