package com.raceforge.backend.training.entity;

import com.raceforge.backend.horse.entity.Horse;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "training_plan")
public class TrainingPlan {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "plan_id")
  private Long planId;

  @ManyToOne
  @JoinColumn(name = "horse_id", nullable = false)
  private Horse horse;

  @Column(name = "created_by_trainer_id", nullable = false)
  private Long createdByTrainerId;

  @Column(name = "description")
  private String description;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public TrainingPlan() {
  }

  public Long getPlanId() {
      return planId;
  }

  public void setPlanId(Long planId) {
      this.planId = planId;
  }

  public Horse getHorse() {
      return horse;
  }

  public void setHorse(Horse horse) {
      this.horse = horse;
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
