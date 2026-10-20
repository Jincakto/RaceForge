package com.raceforge.backend.training.dto;

public class TrainingPlanResponse {

  private String planId;
  private String horseId;
  private String createdBy;
  private String planName;
  private String goal;
  private Integer duration;
  private String status;
  private String notes;

  private String horsePackageId;private String trainerAssignmentId;private String recommendationId;
  public String getHorsePackageId(){return horsePackageId;}public void setHorsePackageId(String value){horsePackageId=value;}
  public String getTrainerAssignmentId(){return trainerAssignmentId;}public void setTrainerAssignmentId(String value){trainerAssignmentId=value;}
  public String getRecommendationId(){return recommendationId;}public void setRecommendationId(String value){recommendationId=value;}
  private String packageType;
  public String getPackageType(){return packageType;}
  public void setPackageType(String value){packageType=value;}
  private String roadmapVersion;
  public String getRoadmapVersion(){return roadmapVersion;}
  public void setRoadmapVersion(String value){roadmapVersion=value;}
  public TrainingPlanResponse() {
  }

  public String getPlanId() {
      return planId;
  }

  public void setPlanId(String planId) {
      this.planId = planId;
  }

  public String getHorseId() {
      return horseId;
  }

  public void setHorseId(String horseId) {
      this.horseId = horseId;
  }

  public String getCreatedBy() {
      return createdBy;
  }

  public void setCreatedBy(String createdBy) {
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
