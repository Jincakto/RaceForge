package com.raceforge.backend.training.dto;

public class TrainingPlanResponse {

  private Integer planId;
  private Integer horseId;
  private Integer createdBy;
  private String planName;
  private String goal;
  private Integer duration;
  private String status;
  private String notes;

  public TrainingPlanResponse() {
  }

  public Integer getPlanId() {
      return planId;
  }

  public void setPlanId(Integer planId) {
      this.planId = planId;
  }

  public Integer getHorseId() {
      return horseId;
  }

  public void setHorseId(Integer horseId) {
      this.horseId = horseId;
  }

  public Integer getCreatedBy() {
      return createdBy;
  }

  public void setCreatedBy(Integer createdBy) {
      this.createdBy = createdBy;
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

  public String getStatus() {
      return status;
  }

  public void setStatus(String status) {
      this.status = status;
  }

  public String getNotes() {
      return notes;
  }

  public void setNotes(String notes) {
      this.notes = notes;
  }
}
