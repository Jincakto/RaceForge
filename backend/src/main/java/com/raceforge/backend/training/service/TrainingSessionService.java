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
    @Autowired private com.raceforge.backend.audit.service.AuditLogService audit;
    @Autowired private TrainingWorkflowGuard workflowGuard;
    @Autowired private SessionStageBinder stageBinder;
    @Autowired private TrainingCalendarRules calendar;
    @Autowired private TrainingSessionRepository trainingSessionRepository;
    @Autowired private TrainingPlanRepository trainingPlanRepository;
    @Autowired private TrainingSessionMapper trainingSessionMapper;
    @Autowired private TrainingPlanHorseResolver horseResolver;
    @Autowired private TrainingSessionRules rules;
    @Autowired private TrainingStageRepository stageRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

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
        session.setScheduledEnd(request.getScheduledEnd());
        stageBinder.bind(session);
        calendar.validateDates(horse.getHorseId(),java.util.List.of(session.getScheduledStart().toLocalDate()));
        var saved=trainingSessionRepository.saveAndFlush(session);
        audit.record(workflowGuard.actor().userId(),saved.getHorse().getHorseId(),"TRAINING_SESSION",saved.getSessionId(),"TRAINING_SESSION_WRITTEN","SUCCESS",saved.getStatus());
        return trainingSessionMapper.toResponse(saved);
    }

    @Transactional
    public TrainingSessionResponse startSession(String sessionId) {
        TrainingSession session = lockedSession(sessionId);
        workflowGuard.requirePlan(session.getPlan());
        rules.requireUnlocked(rules.lockHorse(session.getHorse().getHorseId()));
        rules.requireOpen(session);
        if(session.getActualStart()!=null)throw new BusinessRuleException("Session has already started; it cannot be restarted.");
        workflowGuard.requirePackageDate(session.getPlan(),session.getHorse().getHorseId(),LocalDateTime.now().toLocalDate());
        Integer running=jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Session WHERE horse_id=? AND session_id<>? AND status='SCHEDULED' AND actual_start IS NOT NULL AND actual_end IS NULL",Integer.class,session.getHorse().getHorseId(),sessionId);
        if(running>0)throw new BusinessRuleException("This horse already has an unfinished session.");
        captureRestingHeartRate(session);
        session.setActualStart(LocalDateTime.now());
        var saved=trainingSessionRepository.save(session);
        audit.record(workflowGuard.actor().userId(),saved.getHorse().getHorseId(),"TRAINING_SESSION",saved.getSessionId(),"TRAINING_SESSION_WRITTEN","SUCCESS",saved.getStatus());
        return trainingSessionMapper.toResponse(saved);
    }

    @Transactional
    public TrainingSessionResponse completeSession(String sessionId, CompleteSessionRequest request, String actorId) {
        TrainingSession session = lockedSession(sessionId);
        workflowGuard.authorizePlan(session.getPlan());
        rules.requireUnlocked(rules.lockHorse(session.getHorse().getHorseId()));
        rules.requireOpen(session);
        if (session.getActualStart() == null) {
            throw new BusinessRuleException("Start the session before recording completion.");
        }
        if(session.getActualEnd()==null)throw new BusinessRuleException("Stop the exercise before submitting recovery results.");
        requireBpm(request.getEndExerciseHeartRate(),"endExerciseHeartRate");
        requireBpm(request.getRecoveryHeartRate2Min(),"recoveryHeartRate2Min");
        if(request.getDistance()==null || request.getDistance().signum()<0 || request.getDistance().scale()>2 || request.getDistance().compareTo(new java.math.BigDecimal("999999.99"))>0)
            throw new BusinessRuleException("distance in kilometres is required, non-negative, at most two decimal places and within DECIMAL(8,2).");
        if(request.getAvgSpeed()==null || !Double.isFinite(request.getAvgSpeed()) || request.getAvgSpeed()<0)
            throw new BusinessRuleException("avgSpeed in km/h is required, finite and non-negative.");
        if(request.getMaxSpeed()!=null && (!Double.isFinite(request.getMaxSpeed()) || request.getMaxSpeed()<request.getAvgSpeed()))
            throw new BusinessRuleException("maxSpeed must be finite and at least avgSpeed.");
        LocalDateTime measured=request.getRecoveryMeasuredAt();
        if(measured==null || measured.isBefore(session.getActualEnd()) || measured.isAfter(LocalDateTime.now()))
            throw new BusinessRuleException("recoveryMeasuredAt must not precede exercise stop or be in the future.");
        session.setStatus("COMPLETED");
        session.setEvaluation(request.getPerformanceNotes());
        session.setDistance(request.getDistance());
        session.setEndExerciseHeartRate(request.getEndExerciseHeartRate());
        session.setRecoveryHeartRate2Min(request.getRecoveryHeartRate2Min());
        session.setRecoveryMeasuredAt(measured);
        // Legacy heartRate remains untouched: its original measurement timing is unknown.
        session.setAvgSpeed(request.getAvgSpeed());
        session.setMaxSpeed(request.getMaxSpeed());
        session.setRecordedBy(actorId);
        var saved=trainingSessionRepository.save(session);
        audit.record(workflowGuard.actor().userId(),saved.getHorse().getHorseId(),"TRAINING_SESSION",saved.getSessionId(),"TRAINING_SESSION_WRITTEN","SUCCESS",saved.getStatus());
        return trainingSessionMapper.toResponse(saved);
    }

    @Transactional
    public TrainingSessionResponse stopSession(String sessionId, StopSessionRequest request) {
        TrainingSession session=lockedSession(sessionId);
        // Historical, stopped work may be recorded after package expiry; no new exercise is authorized.
        workflowGuard.authorizePlan(session.getPlan());
        rules.requireUnlocked(rules.lockHorse(session.getHorse().getHorseId()));
        rules.requireOpen(session);
        if(session.getActualStart()==null || session.getActualEnd()!=null)
            throw new BusinessRuleException("Only a started exercise without an end time can be stopped.");
        LocalDateTime now=LocalDateTime.now(), end=now;
        if((request==null || request.stoppedAt()==null) && jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Lock WHERE horse_id=? AND locked_at>=? AND locked_at<=? AND unlocked_at IS NOT NULL",Integer.class,session.getHorse().getHorseId(),session.getActualStart(),now)>0)
            throw new BusinessRuleException("This exercise was interrupted by a released medical lock. Supply stoppedAt and interruptionLockId to exclude the wait for unlock.");
        if(request!=null && request.stoppedAt()!=null){
            var locks=jdbc.queryForList("SELECT locked_at,unlocked_at FROM dbo.Training_Lock WHERE lock_id=? AND horse_id=? AND unlocked_at IS NOT NULL",request.interruptionLockId(),session.getHorse().getHorseId());
            if(locks.size()!=1)throw new BusinessRuleException("Historical stop requires this horse's released medical lock.");
            var lock=locks.get(0);
            LocalDateTime locked=((java.sql.Timestamp)lock.get("locked_at")).toLocalDateTime();
            LocalDateTime unlocked=((java.sql.Timestamp)lock.get("unlocked_at")).toLocalDateTime();
            end=request.stoppedAt();
            if(session.getActualStart().isAfter(locked) || end.isBefore(locked) || end.isAfter(unlocked))
                throw new BusinessRuleException("Historical stop must be during a medical lock that interrupted this exercise.");
        }
        if(!end.isAfter(session.getActualStart()) || end.isAfter(now))throw new BusinessRuleException("Stop time must follow actual start and cannot be in the future.");
        session.setActualEnd(end);
        var saved=trainingSessionRepository.save(session);
        audit.record(workflowGuard.actor().userId(),session.getHorse().getHorseId(),"TRAINING_SESSION",sessionId,"TRAINING_EXERCISE_STOPPED","SUCCESS","Stopped at "+end+(request!=null && request.stoppedAt()!=null?"; released lock "+request.interruptionLockId():"; server time"));
        return trainingSessionMapper.toResponse(saved);
    }

    @Transactional
    public TrainingSessionResponse adjustSession(String id, AdjustSessionRequest request){
        var session=lockedSession(id);workflowGuard.requirePlan(session.getPlan());
        rules.requireUnlocked(rules.lockHorse(session.getHorse().getHorseId()));rules.requireOpen(session);
        if(session.getActualStart()!=null)throw new BusinessRuleException("Only a session that has not started can be adjusted.");
        if(!java.util.Set.of("LOW","MODERATE","HIGH").contains(request.intensity()))throw new BusinessRuleException("Choose LOW, MODERATE or HIGH intensity.");
        if(!request.scheduledStart().isAfter(LocalDateTime.now()))throw new BusinessRuleException("Rescheduled exercise must be in the future.");
        horseResolver.validateSchedule(session.getPlan(),session.getHorse().getHorseId(),request.scheduledStart().toLocalDate());
        var pack=workflowGuard.assignedPackage(session.getPlan().getHorsePackageId());
        int day=Math.toIntExact(java.time.temporal.ChronoUnit.DAYS.between(pack.getStartDate(),request.scheduledStart().toLocalDate())+1);
        var stages=stageRepository.findForDay(session.getPlan().getPlanId(),day);
        if(stages.size()!=1)throw new BusinessRuleException("Adjusted date must belong to one saved roadmap stage.");
        calendar.validateSlot(session.getHorse().getHorseId(),request.scheduledStart(),request.scheduledEnd(),id);
        calendar.validateDates(session.getHorse().getHorseId(),java.util.List.of(request.scheduledStart().toLocalDate()),id);
        if(request.reason().length()>600)throw new BusinessRuleException("Adjustment reason must not exceed 600 characters.");
        String previous=session.getScheduledStart()+" / "+session.getScheduledEnd()+" / "+session.getIntensity();
        session.setScheduledStart(request.scheduledStart());session.setScheduledEnd(request.scheduledEnd());session.setIntensity(request.intensity());
        session.setTrainingStage(stages.get(0));session.setNotes(stages.get(0).getTitle()+" - "+stages.get(0).getActivityName());
        var saved=trainingSessionRepository.saveAndFlush(session);
        audit.record(workflowGuard.actor().userId(),session.getHorse().getHorseId(),"TRAINING_SESSION",id,"TRAINING_SESSION_ADJUSTED","SUCCESS",
            "Before: "+previous+"; After: "+request.scheduledStart()+" / "+request.scheduledEnd()+" / "+request.intensity()+"; Reason: "+request.reason());
        return trainingSessionMapper.toResponse(saved);
    }

    private void captureRestingHeartRate(TrainingSession session){
        var medical=workflowGuard.medical(session.getHorse());
        session.setRestingHeartRate((Integer)medical.get("resting_heart_rate"));
        session.setRestingMedicalRecordId((String)medical.get("medical_record_id"));
        session.setRestingMeasuredAt((LocalDateTime)medical.get("examined_at"));
    }

    private static void requireBpm(Integer value,String field){
        if(value==null || value<=0)throw new BusinessRuleException(field+" in bpm is required and must be positive; this is input validation, not clinical clearance.");
    }

    private TrainingSession lockedSession(String sessionId) {
        var initial=trainingSessionRepository.findById(sessionId)
            .orElseThrow(()->new ResourceNotFoundException("Training session not found: "+sessionId));
        // Match medical/payment lock ordering: horse first, then session.
        rules.lockHorse(initial.getHorse().getHorseId());
        var session=trainingSessionRepository.findByIdForUpdate(sessionId)
            .orElseThrow(()->new ResourceNotFoundException("Training session not found: "+sessionId));
        entityManager.refresh(session);
        return session;
    }
}
