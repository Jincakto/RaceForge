package com.raceforge.backend.training.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class HorsePlanId implements Serializable {

  private Integer planId;
  private Integer horseId;

  public HorsePlanId() {
  }

  public HorsePlanId(Integer planId, Integer horseId) {
      this.planId = planId;
      this.horseId = horseId;
  }

  public Integer getPlanId() { return planId; }
  public void setPlanId(Integer planId) { this.planId = planId; }
  public Integer getHorseId() { return horseId; }
  public void setHorseId(Integer horseId) { this.horseId = horseId; }

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
