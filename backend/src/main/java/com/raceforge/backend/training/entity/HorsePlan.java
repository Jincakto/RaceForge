package com.raceforge.backend.training.entity;

import com.raceforge.backend.horse.entity.Horse;
import jakarta.persistence.*;
import java.time.LocalDate;

// Maps to table Horse_Plan: PK (plan_id, horse_id). Training_Session references this pair.
@Entity
@Table(name = "horse_plan")
public class HorsePlan {

  @EmbeddedId
  private HorsePlanId id;

  @ManyToOne
  @MapsId("planId")
  @JoinColumn(name = "plan_id")
  private TrainingPlan plan;

  @ManyToOne
  @MapsId("horseId")
  @JoinColumn(name = "horse_id")
  private Horse horse;

  @Column(name = "start_date")
  private LocalDate startDate;

  @Column(name = "end_date")
  private LocalDate endDate;

  @Column(name = "status", nullable = false, length = 20)
  private String status;

  @Column(name = "notes", length = 1000)
  private String notes;

  public HorsePlan() {
  }

  public HorsePlanId getId() {
      return id;
  }

  public void setId(HorsePlanId id) {
      this.id = id;
  }

  public TrainingPlan getPlan() {
      return plan;
  }

  public void setPlan(TrainingPlan plan) {
      this.plan = plan;
  }

  public Horse getHorse() {
      return horse;
  }

  public void setHorse(Horse horse) {
      this.horse = horse;
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
