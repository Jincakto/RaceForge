package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.AttendSessionRequest;
import com.raceforge.backend.training.dto.AttendanceResponse;
import com.raceforge.backend.training.dto.ScheduleRecurringRequest;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.mapper.TrainingSessionMapper;
import com.raceforge.backend.training.repository.TrainingPlanRepository;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Recurring schedule generation, attendance (COMPLETED / MISSED) and the speed-drop warning.
 * Works on the same TrainingSession entity as TrainingSessionService, and goes through the horse's
 * training lock the same way (BR-B01, BR-C01, BR-C02).
 */
@Service
public class TrainingScheduleService {

  private static final String STATUS_COMPLETED = "COMPLETED";
  private static final String STATUS_MISSED = "MISSED";
  private static final String REASON_TRAINING_LOCK = "TRAINING_LOCK";

  // Warn when average speed falls more than 35% below the previous completed session.
  private static final double SPEED_DROP_LIMIT = 0.35;
  private static final LocalTime DEFAULT_SESSION_TIME = LocalTime.of(7, 0);

  @Autowired
  private TrainingSessionRepository sessionRepository;

  @Autowired
  private TrainingPlanRepository planRepository;

  @Autowired
  private HorseRepository horseRepository;

  @Autowired
  private TrainingSessionMapper sessionMapper;

  // All-or-nothing: if any generated slot clashes with an existing session, nothing is saved.
  @Transactional
  public List<TrainingSessionResponse> createRecurringSchedule(ScheduleRecurringRequest request) {
      TrainingPlan plan = planRepository.findById(request.getPlanId())
              .orElseThrow(() -> new ResourceNotFoundException("Training plan not found: " + request.getPlanId()));

      Horse horse = plan.getHorse();
      if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
          throw new BusinessRuleException("Horse is training-locked, cannot schedule sessions.");
      }

      int weeks = (request.getDurationWeeks() != null && request.getDurationWeeks() > 0)
              ? request.getDurationWeeks() : 1;
      LocalTime time = request.getSessionTime() != null ? request.getSessionTime() : DEFAULT_SESSION_TIME;

      List<LocalDate> dates = new ArrayList<>();
      Set<DayOfWeek> days = request.getDaysOfWeek();
      if (days != null && !days.isEmpty()) {
          // Weekday mode: first matching weekday on/after startDate, then repeat weekly.
          for (DayOfWeek day : days) {
              LocalDate first = request.getStartDate().with(TemporalAdjusters.nextOrSame(day));
              for (int w = 0; w < weeks; w++) {
                  dates.add(first.plusWeeks(w));
              }
          }
      } else {
          // Specific-date mode: startDate itself, repeated weekly when durationWeeks > 1.
          for (int w = 0; w < weeks; w++) {
              dates.add(request.getStartDate().plusWeeks(w));
          }
      }
      dates.sort(Comparator.naturalOrder());

      List<TrainingSession> toSave = new ArrayList<>();
      for (LocalDate date : dates) {
          LocalDateTime when = LocalDateTime.of(date, time);
          // BR-C03: checked up front so the caller gets a clear 409 instead of a raw DB error.
          if (sessionRepository.existsByHorse_HorseIdAndScheduledTime(horse.getHorseId(), when)) {
              throw new BusinessRuleException(
                      "Horse already has a session at " + when + ". No sessions were created.");
          }
          TrainingSession session = new TrainingSession();
          session.setPlan(plan);
          session.setHorse(horse);
          session.setScheduledTime(when);
          session.setActivityName(request.getActivityName());
          toSave.add(session);
      }

      return sessionRepository.saveAll(toSave).stream()
              .map(sessionMapper::toResponse)
              .collect(Collectors.toList());
  }

  @Transactional
  public AttendanceResponse submitAttendance(Long sessionId, AttendSessionRequest request) {
      TrainingSession session = sessionRepository.findById(sessionId)
              .orElseThrow(() -> new ResourceNotFoundException("Training session not found: " + sessionId));

      String status = request.getStatus().trim().toUpperCase(Locale.ROOT);
      if (!STATUS_COMPLETED.equals(status) && !STATUS_MISSED.equals(status)) {
          throw new BusinessRuleException("status must be COMPLETED or MISSED.");
      }

      // BR-C01/BR-C02: re-check the lock right now and hold the horse row until this transaction
      // ends, so a Vet lock cannot slip in between the check and the write below.
      Horse horse = horseRepository.findByIdForUpdate(session.getHorse().getHorseId())
              .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
      boolean locked = Boolean.TRUE.equals(horse.getTrainingLocked());

      boolean warningTriggered = false;
      String warningMessage = null;

      if (STATUS_MISSED.equals(status)) {
          String reason = request.getAbsenceReason();
          if (reason == null || reason.isBlank()) {
              if (!locked) {
                  throw new BusinessRuleException("absenceReason is required when status is MISSED.");
              }
              reason = REASON_TRAINING_LOCK; // horse is locked: that is the reason by definition
          }

          session.setStatus(STATUS_MISSED);
          session.setAbsenceReason(reason.trim().toUpperCase(Locale.ROOT));
          session.setAbsenceNote(request.getAbsenceNote());
          // Clear the COMPLETED-only fields in case this session was recorded differently before.
          session.setHeartRate(null);
          session.setAvgSpeed(null);
          session.setMaxSpeed(null);
          session.setWarningTriggered(false);
      } else {
          if (locked) {
              throw new BusinessRuleException(
                      "Horse is training-locked, this session cannot be recorded as COMPLETED. Mark it MISSED instead.");
          }
          if (request.getAvgSpeed() == null || request.getAvgSpeed() <= 0) {
              throw new BusinessRuleException("avgSpeed (> 0) is required when status is COMPLETED.");
          }

          session.setStatus(STATUS_COMPLETED);
          session.setHeartRate(request.getHeartRate());
          session.setAvgSpeed(request.getAvgSpeed());
          session.setMaxSpeed(request.getMaxSpeed());
          session.setAbsenceReason(null);
          session.setAbsenceNote(null);
          session.setWarningTriggered(false);

          // Baseline: the latest completed session BEFORE this one, with a recorded speed.
          Optional<TrainingSession> previous = sessionRepository
                  .findFirstByHorse_HorseIdAndStatusAndAvgSpeedIsNotNullAndScheduledTimeBeforeOrderByScheduledTimeDesc(
                          horse.getHorseId(), STATUS_COMPLETED, session.getScheduledTime());

          if (previous.isPresent()) {
              double previousSpeed = previous.get().getAvgSpeed();
              double currentSpeed = request.getAvgSpeed();
              if (previousSpeed > 0 && currentSpeed < previousSpeed * (1 - SPEED_DROP_LIMIT)) {
                  warningTriggered = true;
                  session.setWarningTriggered(true);
                  warningMessage = String.format(Locale.ROOT,
                          "WARNING: average speed (%.2f km/h) dropped more than 35%% versus the previous completed session (%.2f km/h).",
                          currentSpeed, previousSpeed);
              }
          }
      }

      session.setPerformedBy(request.getPerformedBy());
      session.setUpdatedAt(LocalDateTime.now());

      TrainingSession saved = sessionRepository.save(session);
      return new AttendanceResponse(sessionMapper.toResponse(saved), warningTriggered, warningMessage);
  }

  @Transactional(readOnly = true)
  public List<TrainingSessionResponse> getScheduleByHorseId(Long horseId) {
      if (!horseRepository.existsById(horseId)) {
          throw new ResourceNotFoundException("Horse not found: " + horseId);
      }
      return sessionRepository.findByHorse_HorseIdOrderByScheduledTimeAsc(horseId).stream()
              .map(sessionMapper::toResponse)
              .collect(Collectors.toList());
  }
}
