package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.HorsePlan;
import com.raceforge.backend.training.entity.HorsePlanId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HorsePlanRepository extends JpaRepository<HorsePlan, HorsePlanId> {

<<<<<<< HEAD
  List<HorsePlan> findById_PlanId(Integer planId);
=======
  List<HorsePlan> findById_PlanId(String planId);

  @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "plan")
  List<HorsePlan> findById_HorseIdOrderById_PlanIdDesc(String horseId);
>>>>>>> 76de6e5 (luu code)
}
