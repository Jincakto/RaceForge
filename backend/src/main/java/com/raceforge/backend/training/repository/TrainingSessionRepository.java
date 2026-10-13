package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingSession;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Integer> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from TrainingSession s where s.sessionId = :id")
  Optional<TrainingSession> findByIdForUpdate(@Param("id") Integer id);

  List<TrainingSession> findByHorse_HorseIdOrderByScheduledStartAsc(Integer horseId);

  boolean existsByHorse_HorseIdAndScheduledStart(Integer horseId, LocalDateTime scheduledStart);
}
