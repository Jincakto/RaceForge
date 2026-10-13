package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.TrainingPlanCreateRequest;
import com.raceforge.backend.training.dto.TrainingPlanResponse;
import com.raceforge.backend.training.entity.HorsePlan;
import com.raceforge.backend.training.entity.HorsePlanId;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.mapper.TrainingPlanMapper;
import com.raceforge.backend.training.repository.HorsePlanRepository;
import com.raceforge.backend.training.repository.TrainingPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingPlanService {

  @Autowired
  private TrainingPlanRepository trainingPlanRepository;

  @Autowired
  private HorsePlanRepository horsePlanRepository;

  @Autowired
  private HorseRepository horseRepository;

  @Autowired
  private TrainingPlanMapper trainingPlanMapper;

  @Transactional
  public TrainingPlanResponse createPlan(Integer horseId, TrainingPlanCreateRequest request, Integer actorId) {
      if (request.getStartDate() != null && request.getEndDate() != null
              && request.getEndDate().isBefore(request.getStartDate())) {
          throw new com.raceforge.backend.common.exception.BusinessRuleException("endDate must not precede startDate.");
      }
      Horse horse = horseRepository.findById(horseId)
              .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));

      TrainingPlan plan = new TrainingPlan();
      plan.setCreatedBy(actorId);
      plan.setPlanName(request.getPlanName());
      plan.setGoal(request.getGoal());
      plan.setDuration(request.getDuration());
      plan.setNotes(request.getNotes());
      plan.setStatus("ACTIVE");
      TrainingPlan saved = trainingPlanRepository.save(plan);

      // Horse_Plan link: Training_Session has a composite FK to this pair.
      HorsePlan horsePlan = new HorsePlan();
      horsePlan.setId(new HorsePlanId(saved.getPlanId(), horse.getHorseId()));
      horsePlan.setPlan(saved);
      horsePlan.setHorse(horse);
      horsePlan.setStartDate(request.getStartDate());
      horsePlan.setEndDate(request.getEndDate());
      horsePlan.setStatus("ACTIVE");
      horsePlanRepository.save(horsePlan);

      return trainingPlanMapper.toResponse(saved, horse.getHorseId());
  }
}
