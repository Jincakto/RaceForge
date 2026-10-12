package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.training.entity.HorsePlan;
import com.raceforge.backend.training.entity.HorsePlanId;
import com.raceforge.backend.training.repository.HorsePlanRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * A plan can cover several horses (Horse_Plan), and Training_Session has a composite FK to
 * Horse_Plan. This finds the horse a session request is meant for.
 */
@Component
public class TrainingPlanHorseResolver {

  @Autowired
  private HorsePlanRepository horsePlanRepository;

  public Horse resolve(Integer planId, Integer horseId) {
      if (horseId != null) {
          HorsePlan hp = horsePlanRepository.findById(new HorsePlanId(planId, horseId))
                  .orElseThrow(() -> new ResourceNotFoundException(
                          "Horse " + horseId + " is not part of training plan " + planId));
          return hp.getHorse();
      }
      List<HorsePlan> horses = horsePlanRepository.findById_PlanId(planId);
      if (horses.isEmpty()) {
          throw new ResourceNotFoundException("Training plan " + planId + " has no horse.");
      }
      if (horses.size() > 1) {
          throw new BusinessRuleException("Training plan has several horses, horseId is required.");
      }
      return horses.get(0).getHorse();
  }
}
