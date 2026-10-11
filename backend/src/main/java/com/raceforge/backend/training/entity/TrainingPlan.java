package com.raceforge.backend.training.entity;

import jakarta.persistence.*;

// Maps to table Training_Plan. The horses a plan applies to are in Horse_Plan (see HorsePlan).
@Entity
@Table(name = "training_plan")
public class TrainingPlan {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "plan_id")
  private Integer planId;

  // [User](user_id) of the creator; raw id, no User entity yet.
  @Column(name = "created_by", nullable = false)
  private Integer createdBy;

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

  public TrainingPlan() {
  }

  public Integer getPlanId() {
      return planId;
  }

  public void setPlanId(Integer planId) {
      this.planId = planId;
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
