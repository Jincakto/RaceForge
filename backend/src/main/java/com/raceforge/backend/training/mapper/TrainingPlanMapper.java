package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.dto.TrainingPlanResponse;
import com.raceforge.backend.training.entity.TrainingPlan;
import org.springframework.stereotype.Component;

@Component
public class TrainingPlanMapper {

  public TrainingPlanResponse toResponse(TrainingPlan plan, String horseId) {
      TrainingPlanResponse response = new TrainingPlanResponse();

      response.setPackageType(plan.getPackageType());
      response.setRoadmapVersion(plan.getRoadmapVersion());
      response.setPlanId(plan.getPlanId());
      response.setHorseId(horseId);
      response.setCreatedBy(plan.getCreatedBy());
      response.setPlanName(plan.getPlanName());
      response.setGoal(plan.getGoal());
      response.setDuration(plan.getDuration());
      response.setStatus(plan.getStatus());
      response.setNotes(plan.getNotes());

      response.setHorsePackageId(plan.getHorsePackageId());response.setTrainerAssignmentId(plan.getTrainerAssignmentId());
      return response;
  }
}
