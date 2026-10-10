package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingSession;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {

  List<TrainingSession> findByHorse_HorseIdOrderByScheduledTimeAsc(Long horseId);

  boolean existsByHorse_HorseIdAndScheduledTime(Long horseId, LocalDateTime scheduledTime);

  // Baseline for the speed-drop warning: the most recent COMPLETED session that happened before
  // the given time and actually has a recorded average speed.
  Optional<TrainingSession>
          findFirstByHorse_HorseIdAndStatusAndAvgSpeedIsNotNullAndScheduledTimeBeforeOrderByScheduledTimeDesc(
                  Long horseId, String status, LocalDateTime before);
}
