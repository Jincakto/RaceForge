package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.TrainingPlanOptionResponse;
import java.util.List;
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

  @Autowired private TrainingWorkflowGuard workflowGuard;
  @Autowired private PackageRoadmapPolicy packageRoadmaps;
  @Autowired private TrainingRecommendationService recommendations;
  @Autowired private TrainingRoadmapService roadmaps;
  @Autowired
  private TrainingPlanRepository trainingPlanRepository;

  @Autowired
  private HorsePlanRepository horsePlanRepository;

  @Autowired
  private HorseRepository horseRepository;

  @Autowired
  private TrainingPlanMapper trainingPlanMapper;

  @Transactional(readOnly = true)
  public List<TrainingPlanOptionResponse> getPlansForHorse(String horseId) {
      if (!horseRepository.existsById(horseId)) {
          throw new ResourceNotFoundException("Horse not found: " + horseId);
      }
      return horsePlanRepository.findById_HorseIdOrderById_PlanIdDesc(horseId).stream()
              .filter(link -> workflowGuard.canAccessPackage(link.getPlan().getHorsePackageId(),workflowGuard.actor().userId()))
              .map(link -> new TrainingPlanOptionResponse(
                      link.getPlan().getPlanId(), horseId, link.getPlan().getPlanName(),
                      link.getPlan().getStatus(), link.getStatus(), link.getStartDate(), link.getEndDate()))
              .toList();
  }

  @Transactional
  public TrainingPlanResponse createPlan(String horseId, TrainingPlanCreateRequest request, String actorId) {
      if (request.getStartDate() != null && request.getEndDate() != null
              && request.getEndDate().isBefore(request.getStartDate())) {
          throw new com.raceforge.backend.common.exception.BusinessRuleException("endDate must not precede startDate.");
      }
      Horse horse = horseRepository.findById(horseId)
              .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));

      var pack=workflowGuard.assignment(request.getAssignmentId(),horseId);
      java.util.List<com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage> stages=request.getStages();
      if(request.getRecommendationId()!=null){
          if(!Boolean.TRUE.equals(request.getRecommendationConfirmed()))throw new com.raceforge.backend.common.exception.BusinessRuleException("Trainer must confirm the suggestion before creating a plan");
          var suggested=recommendations.stagesForPlan(request.getRecommendationId(),pack.getHorsePackageId(),request.getAssignmentId());
          if(stages==null||stages.isEmpty())stages=suggested;
      }
      TrainingRecommendationService.validateStages(stages,(int)java.time.temporal.ChronoUnit.DAYS.between(pack.getStartDate(),pack.getEndDate())+1);
      if((request.getStartDate()!=null&&!request.getStartDate().equals(pack.getStartDate()))||(request.getEndDate()!=null&&!request.getEndDate().equals(pack.getEndDate())))throw new com.raceforge.backend.common.exception.BusinessRuleException("Plan dates must match the selected paid package period");
      TrainingPlan plan = new TrainingPlan();
      plan.setHorseId(horseId);
      plan.setPackageType(pack.getTrainingPackage().getPackageType());plan.setRoadmapVersion(PackageRoadmapPolicy.VERSION);
      plan.setHorsePackageId(pack.getHorsePackageId());plan.setTrainerAssignmentId(request.getAssignmentId());plan.setRecommendationId(request.getRecommendationId());
      plan.setCreatedBy(actorId);
      plan.setPlanName(request.getPlanName());
      plan.setGoal(request.getGoal()==null||request.getGoal().isBlank()?packageRoadmaps.template(plan.getPackageType(),(int)java.time.temporal.ChronoUnit.DAYS.between(pack.getStartDate(),pack.getEndDate())+1).goal():request.getGoal());
      plan.setDuration(request.getDuration());
      plan.setNotes(request.getNotes());
      plan.setStatus("ACTIVE");
      TrainingPlan saved = trainingPlanRepository.save(plan);

      // Horse_Plan link: Training_Session has a composite FK to this pair.
      HorsePlan horsePlan = new HorsePlan();
      horsePlan.setId(new HorsePlanId(saved.getPlanId(), horse.getHorseId()));
      horsePlan.setPlan(saved);
      horsePlan.setHorse(horse);
      horsePlan.setStartDate(pack.getStartDate());
      horsePlan.setEndDate(pack.getEndDate());
      horsePlan.setStatus("ACTIVE");
      horsePlanRepository.saveAndFlush(horsePlan);
      roadmaps.replace(saved.getPlanId(),stages);

      return trainingPlanMapper.toResponse(saved, horse.getHorseId());
  }
}
