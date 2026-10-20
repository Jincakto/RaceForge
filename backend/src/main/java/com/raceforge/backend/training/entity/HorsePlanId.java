package com.raceforge.backend.training.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class HorsePlanId implements Serializable {

  private String planId;
  private String horseId;

  public HorsePlanId() {
  }

  public HorsePlanId(String planId, String horseId) {
      this.planId = planId;
      this.horseId = horseId;
  }

  public String getPlanId() { return planId; }
  public void setPlanId(String planId) { this.planId = planId; }
  public String getHorseId() { return horseId; }
  public void setHorseId(String horseId) { this.horseId = horseId; }

  @Override
  public boolean equals(Object o) {
      if (this == o) return true;
      if (!(o instanceof HorsePlanId that)) return false;
      return Objects.equals(planId, that.planId) && Objects.equals(horseId, that.horseId);
  }

  @Override
  public int hashCode() {
      return Objects.hash(planId, horseId);
  }
}
