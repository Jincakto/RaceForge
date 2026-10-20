package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

public class TrainingPlanCreateRequest {

  // Authenticated User String ID -> Training_Plan.created_by; Trainer profile uses a separate HTR-xxx String ID.
  // Legacy trainerId is ignored; creator is the authenticated principal.
  private String trainerId;

  // Training_Plan.plan_name (NOT NULL)
  @NotBlank
  @Size(max = 150)
  private String planName;

  @Size(max = 500)
  private String goal;
  @Positive
  private Integer duration;
  @Size(max = 1000)
  private String notes;

  // Horse_Plan.start_date / end_date for the horse this plan is created for
  private LocalDate startDate;
  private LocalDate endDate;

  @jakarta.validation.constraints.NotBlank private String assignmentId;
  private String recommendationId;
  private Boolean recommendationConfirmed;
  @jakarta.validation.Valid private java.util.List<TrainingWorkflowDtos.Stage> stages;
  public String getAssignmentId(){return assignmentId;} public void setAssignmentId(String value){assignmentId=value;}
  public String getRecommendationId(){return recommendationId;} public void setRecommendationId(String value){recommendationId=value;}
  public Boolean getRecommendationConfirmed(){return recommendationConfirmed;} public void setRecommendationConfirmed(Boolean value){recommendationConfirmed=value;}
  public java.util.List<TrainingWorkflowDtos.Stage> getStages(){return stages;} public void setStages(java.util.List<TrainingWorkflowDtos.Stage> value){stages=value;}
  public TrainingPlanCreateRequest() {
  }

  public String getTrainerId() {
      return trainerId;
  }

  public void setTrainerId(String trainerId) {
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
