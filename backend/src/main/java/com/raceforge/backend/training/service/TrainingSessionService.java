package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.CompleteSessionRequest;
import com.raceforge.backend.training.dto.ScheduleSessionRequest;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.mapper.TrainingSessionMapper;
import com.raceforge.backend.training.repository.TrainingPlanRepository;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BR-C01/BR-C02: a horse's lock status must be re-checked at the exact moment a session starts
 * or completes, inside the same transaction as the write — never reusing the check made when the
 * session was first scheduled.
 */
@Service
public class TrainingSessionService {

  @Autowired
  private TrainingSessionRepository trainingSessionRepository;

  @Autowired
  private TrainingPlanRepository trainingPlanRepository;

  @Autowired
  private HorseRepository horseRepository;

  @Autowired
  private TrainingSessionMapper trainingSessionMapper;

  @Autowired
  private TrainingPlanHorseResolver horseResolver;

  @Transactional
  public TrainingSessionResponse scheduleSession(ScheduleSessionRequest request) {
      TrainingPlan plan = trainingPlanRepository.findById(request.getPlanId())
              .orElseThrow(() -> new ResourceNotFoundException("Training plan not found: " + request.getPlanId()));

      Horse horse = horseResolver.resolve(plan.getPlanId(), request.getHorseId());
      if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
          throw new BusinessRuleException("Horse is training-locked, cannot schedule a session.");
      }

      TrainingSession session = new TrainingSession();
      session.setPlan(plan);
      session.setHorse(horse);
      session.setScheduledStart(request.getScheduledTime());

      // BR-C03: checked up front so the caller gets a clear error instead of a raw DB one.
      if (trainingSessionRepository.existsByHorse_HorseIdAndScheduledStart(horse.getHorseId(), request.getScheduledTime())) {
          throw new BusinessRuleException("Horse already has a session at " + request.getScheduledTime());
      }

      TrainingSession saved = trainingSessionRepository.save(session);
      return trainingSessionMapper.toResponse(saved);
  }

  @Transactional
  public TrainingSessionResponse startSession(Integer sessionId) {
      TrainingSession session = trainingSessionRepository.findById(sessionId)
              .orElseThrow(() -> new ResourceNotFoundException("Training session not found: " + sessionId));

      // BR-C01/BR-C02: re-check the lock right now, not the value seen at schedule time, and hold
      // a row lock on the horse for the rest of this transaction so a concurrent Vet lock cannot
      // slip in between this check and whatever happens next.
      Horse horse = horseRepository.findByIdForUpdate(session.getHorse().getHorseId())
              .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));

      if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
          throw new BusinessRuleException("Horse is training-locked, cannot start this session.");
      }

      return trainingSessionMapper.toResponse(session);
  }

  @Transactional
  public TrainingSessionResponse completeSession(Integer sessionId, CompleteSessionRequest request) {
      TrainingSession session = trainingSessionRepository.findById(sessionId)
              .orElseThrow(() -> new ResourceNotFoundException("Training session not found: " + sessionId));

      session.setStatus("COMPLETED");
      session.setActualEnd(LocalDateTime.now());
      session.setEvaluation(request.getPerformanceNotes());

      TrainingSession saved = trainingSessionRepository.save(session);
      return trainingSessionMapper.toResponse(saved);
  }
}
