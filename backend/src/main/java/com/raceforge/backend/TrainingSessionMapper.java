package com.raceforge.backend.training.mapper;

import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.entity.TrainingSession;
import org.springframework.stereotype.Component;

@Component
public class TrainingSessionMapper {

  public TrainingSessionResponse toResponse(TrainingSession session) {
      TrainingSessionResponse response = new TrainingSessionResponse();

      response.setSessionId(session.getSessionId());
      response.setPlanId(session.getPlan().getPlanId());
      response.setHorseId(session.getHorse().getHorseId());
      response.setScheduledTime(session.getScheduledTime());
      response.setStatus(session.getStatus());
      response.setPerformanceNotes(session.getPerformanceNotes());
      response.setActivityName(session.getActivityName());
      response.setAbsenceReason(session.getAbsenceReason());
      response.setAbsenceNote(session.getAbsenceNote());
      response.setHeartRate(session.getHeartRate());
      response.setAvgSpeed(session.getAvgSpeed());
      response.setMaxSpeed(session.getMaxSpeed());
      response.setWarningTriggered(session.getWarningTriggered());
      response.setPerformedBy(session.getPerformedBy());
      response.setUpdatedAt(session.getUpdatedAt());

      return response;
  }
}
