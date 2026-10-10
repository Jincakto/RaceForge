package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.dto.TrainingPlanResponse;
import com.raceforge.backend.training.entity.TrainingPlan;
import org.springframework.stereotype.Component;

@Component
public class TrainingPlanMapper {

  public TrainingPlanResponse toResponse(TrainingPlan plan) {
      TrainingPlanResponse response = new TrainingPlanResponse();

      response.setPlanId(plan.getPlanId());
      response.setHorseId(plan.getHorse().getHorseId());
      response.setCreatedByTrainerId(plan.getCreatedByTrainerId());
      response.setDescription(plan.getDescription());
      response.setCreatedAt(plan.getCreatedAt());

      return response;
  }
}
