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
      response.setScheduledStart(session.getScheduledStart());
      response.setScheduledEnd(session.getScheduledEnd());
      response.setDistance(session.getDistance());
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
