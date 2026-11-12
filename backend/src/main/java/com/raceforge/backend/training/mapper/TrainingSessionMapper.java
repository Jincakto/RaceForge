package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.entity.TrainingSession;
import org.springframework.stereotype.Component;

@Component
public class TrainingSessionMapper {
  @org.springframework.beans.factory.annotation.Autowired private com.raceforge.backend.training.service.TrainingAssessmentService assessmentService;
  @org.springframework.beans.factory.annotation.Autowired private com.raceforge.backend.training.service.TrainingScheduleCoordinator scheduleCoordinator;
  public TrainingSessionResponse toResponse(TrainingSession session){return toResponses(java.util.List.of(session)).get(0);}
  public java.util.List<TrainingSessionResponse> toResponses(java.util.List<TrainingSession> sessions){
      var responses=sessions.stream().map(this::toUnassignedResponse).toList();
      scheduleCoordinator.decorate(responses);
      assessmentService.enrich(sessions,responses);return responses;
  }

  private TrainingSessionResponse toUnassignedResponse(TrainingSession session) {
      TrainingSessionResponse response = new TrainingSessionResponse();

      response.setRestingHeartRate(session.getRestingHeartRate());
      response.setRestingMedicalRecordId(session.getRestingMedicalRecordId());
      response.setRestingMeasuredAt(session.getRestingMeasuredAt());
      response.setHorsePackageId(session.getPlan().getHorsePackageId());
      boolean locked=Boolean.TRUE.equals(session.getHorse().getTrainingLocked());
      boolean open="SCHEDULED".equals(session.getStatus());
      response.setTrainingLocked(locked);
      // UI hints only: all write endpoints repeat authorization and live DB checks.
      response.setCanStart(!locked && open && session.getActualStart()==null);
      response.setCanStop(!locked && open && session.getActualStart()!=null && session.getActualEnd()==null);
      response.setCanComplete(!locked && open && session.getActualEnd()!=null);
      if(session.getActualStart()!=null && session.getActualEnd()!=null)
          response.setActualDurationSeconds(java.time.Duration.between(session.getActualStart(),session.getActualEnd()).getSeconds());
      response.setPackageType(session.getPlan().getPackageType());
      response.setRoadmapVersion(session.getPlan().getRoadmapVersion());
      if(session.getTrainingStage()!=null){
          var stage=session.getTrainingStage();response.setStageId(stage.getStageId());
          response.setPhaseCode(stage.getPhaseCode());response.setStageTitle(stage.getTitle());
          response.setObjective(stage.getObjective());response.setActivityName(stage.getActivityName());
      }
      response.setSessionId(session.getSessionId());
      response.setPlanId(session.getPlan().getPlanId());
      response.setHorseId(session.getHorse().getHorseId());
      response.setScheduledStart(session.getScheduledStart());
      response.setScheduledEnd(session.getScheduledEnd());
      response.setDistance(session.getDistance());
      response.setAvgSpeed(session.getAvgSpeed());
      response.setMaxSpeed(session.getMaxSpeed());
      response.setRecordedBy(session.getRecordedBy());
      response.setIntensity(session.getIntensity());
      response.setSurface(session.getSurface());
      response.setStatus(session.getStatus());
      response.setActualStart(session.getActualStart());
      response.setActualEnd(session.getActualEnd());
      response.setEvaluation(session.getEvaluation());
      response.setNotes(session.getNotes());

      return response;
  }
}
