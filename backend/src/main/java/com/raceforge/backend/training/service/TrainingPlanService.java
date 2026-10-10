package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.TrainingPlanCreateRequest;
import com.raceforge.backend.training.dto.TrainingPlanResponse;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.mapper.TrainingPlanMapper;
import com.raceforge.backend.training.repository.TrainingPlanRepository;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TrainingPlanService {

  @Autowired
  private TrainingPlanRepository trainingPlanRepository;

  @Autowired
  private HorseRepository horseRepository;

  @Autowired
  private TrainingPlanMapper trainingPlanMapper;

  // Note: creating/editing a plan is Head Trainer only (BR-B06/BR-B07). Role enforcement is left
  // as a TODO until JWT auth + the permission module from the earlier design discussion exist.
  public TrainingPlanResponse createPlan(Long horseId, TrainingPlanCreateRequest request) {
      Horse horse = horseRepository.findById(horseId)
              .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));

      TrainingPlan plan = new TrainingPlan();
      plan.setHorse(horse);
      plan.setCreatedByTrainerId(request.getTrainerId());
      plan.setDescription(request.getDescription());
      plan.setCreatedAt(LocalDateTime.now());

      TrainingPlan saved = trainingPlanRepository.save(plan);
      return trainingPlanMapper.toResponse(saved);
  }
}
