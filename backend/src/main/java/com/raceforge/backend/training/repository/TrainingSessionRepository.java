package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingSession;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Integer> {

  List<TrainingSession> findByHorse_HorseIdOrderByScheduledStartAsc(Integer horseId);

  boolean existsByHorse_HorseIdAndScheduledStart(Integer horseId, LocalDateTime scheduledStart);
}
