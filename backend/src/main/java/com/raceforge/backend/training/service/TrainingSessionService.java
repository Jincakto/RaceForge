package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.mapper.TrainingSessionMapper;
import com.raceforge.backend.training.repository.*;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingSessionService {
    @Autowired private TrainingSessionRepository trainingSessionRepository;
    @Autowired private TrainingPlanRepository trainingPlanRepository;
    @Autowired private TrainingSessionMapper trainingSessionMapper;
    @Autowired private TrainingPlanHorseResolver horseResolver;
    @Autowired private TrainingSessionRules rules;

    @Transactional
    public TrainingSessionResponse scheduleSession(ScheduleSessionRequest request) {
        TrainingPlan plan = trainingPlanRepository.findById(request.getPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("Training plan not found: " + request.getPlanId()));
        Horse linked = horseResolver.resolve(plan.getPlanId(), request.getHorseId());
        Horse horse = rules.lockHorse(linked.getHorseId());
        rules.requireUnlocked(horse);
        horseResolver.validateSchedule(plan, horse.getHorseId(), request.getScheduledTime().toLocalDate());
        if (trainingSessionRepository.existsByHorse_HorseIdAndScheduledStart(horse.getHorseId(), request.getScheduledTime())) {
            throw new BusinessRuleException("Horse already has a session at " + request.getScheduledTime());
        }
        TrainingSession session = new TrainingSession();
        session.setPlan(plan);
        session.setHorse(horse);
        session.setScheduledStart(request.getScheduledTime());
        return trainingSessionMapper.toResponse(trainingSessionRepository.save(session));
    }

    @Transactional
    public TrainingSessionResponse startSession(Integer sessionId) {
        TrainingSession session = lockedSession(sessionId);
        rules.requireUnlocked(rules.lockHorse(session.getHorse().getHorseId()));
        rules.requireOpen(session);
        if (session.getActualStart() == null) session.setActualStart(LocalDateTime.now());
        return trainingSessionMapper.toResponse(trainingSessionRepository.save(session));
    }

    @Transactional
    public TrainingSessionResponse completeSession(Integer sessionId, CompleteSessionRequest request, Integer actorId) {
        TrainingSession session = lockedSession(sessionId);
        rules.requireUnlocked(rules.lockHorse(session.getHorse().getHorseId()));
        rules.requireOpen(session);
        if (session.getActualStart() == null) {
            throw new BusinessRuleException("Start the session before recording completion.");
        }
        if (request.getHeartRate() == null || request.getHeartRate() <= 0) {
            throw new BusinessRuleException("heartRate (bpm) is required and must be positive.");
        }
        if (request.getAvgSpeed() == null || !Double.isFinite(request.getAvgSpeed()) || request.getAvgSpeed() < 0) {
            throw new BusinessRuleException("avgSpeed (km/h) is required and must be finite and non-negative.");
        }
        if (request.getMaxSpeed() != null && (!Double.isFinite(request.getMaxSpeed())
                || request.getMaxSpeed() < request.getAvgSpeed())) {
            throw new BusinessRuleException("maxSpeed must be finite and at least avgSpeed.");
        }
        LocalDateTime end = LocalDateTime.now();
        if (!end.isAfter(session.getActualStart())) {
            throw new BusinessRuleException("Completion time must be after the start time.");
        }
        session.setStatus("COMPLETED");
        session.setActualEnd(end);
        session.setEvaluation(request.getPerformanceNotes());
        session.setHeartRate(request.getHeartRate());
        session.setAvgSpeed(request.getAvgSpeed());
        session.setMaxSpeed(request.getMaxSpeed());
        session.setRecordedBy(actorId);
        return trainingSessionMapper.toResponse(trainingSessionRepository.save(session));
    }

    private TrainingSession lockedSession(Integer sessionId) {
        return trainingSessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Training session not found: " + sessionId));
    }
}
