package com.raceforge.backend.training.entity;

import jakarta.persistence.*;

// Maps to table Training_Plan. The horses a plan applies to are in Horse_Plan (see HorsePlan).
@Entity
@Table(name = "Training_Plan")
public class TrainingPlan extends com.raceforge.backend.common.id.BusinessEntity {

  @Id
  @Column(name = "plan_id")
  private String planId;

  // [User](user_id) of the authenticated creator; persisted as an integer FK.
  @Column(name = "created_by", nullable = false)
  private String createdBy;

  @Column(name = "plan_name", nullable = false, length = 150)
  private String planName;

  @Column(name = "goal", length = 500)
  private String goal;

  @Column(name = "duration")
  private Integer duration;

  @Column(name = "status", nullable = false, length = 20)
  private String status;

  @Column(name = "notes", length = 1000)
  private String notes;

  @jakarta.persistence.Column(name="horse_id",nullable=false) private String horseId;
  public String getHorseId(){return horseId;}public void setHorseId(String value){horseId=value;}
  @jakarta.persistence.Column(name="horse_package_id") private String horsePackageId;
  @jakarta.persistence.Column(name="trainer_assignment_id") private String trainerAssignmentId;
  @jakarta.persistence.Column(name="recommendation_id") private String recommendationId;
  public String getHorsePackageId(){return horsePackageId;} public void setHorsePackageId(String value){horsePackageId=value;}
  public String getTrainerAssignmentId(){return trainerAssignmentId;} public void setTrainerAssignmentId(String value){trainerAssignmentId=value;}
  public String getRecommendationId(){return recommendationId;} public void setRecommendationId(String value){recommendationId=value;}
  @jakarta.persistence.ManyToOne(fetch=jakarta.persistence.FetchType.LAZY)
  @jakarta.persistence.JoinColumn(name="horse_package_id",insertable=false,updatable=false) private HorsePackage horsePackage;
  @jakarta.persistence.ManyToOne(fetch=jakarta.persistence.FetchType.LAZY)
  @jakarta.persistence.JoinColumn(name="trainer_assignment_id",insertable=false,updatable=false) private TrainerAssignment trainerAssignment;
  @Column(name="package_type",length=30) private String packageType;
  @Column(name="roadmap_version",length=50) private String roadmapVersion;
  public String getPackageType(){return packageType;}public void setPackageType(String value){packageType=value;}
  public String getRoadmapVersion(){return roadmapVersion;}public void setRoadmapVersion(String value){roadmapVersion=value;}
  public TrainingPlan() {
  }

  public String getPlanId() {
      return planId;
  }

  public void setPlanId(String planId) {
      this.planId = planId;
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
