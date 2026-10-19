package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.HorsePlan;
import com.raceforge.backend.training.entity.HorsePlanId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HorsePlanRepository extends JpaRepository<HorsePlan, HorsePlanId> {

  List<HorsePlan> findById_PlanId(Integer planId);
}
