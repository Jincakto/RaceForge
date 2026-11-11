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

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, String> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from TrainingSession s where s.sessionId = :id")
  Optional<TrainingSession> findByIdForUpdate(@Param("id") String id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from TrainingSession s join s.plan p where p.horsePackageId = :packageId order by s.sessionId")
  List<TrainingSession> findForPackageForUpdate(@Param("packageId") String packageId);

  List<TrainingSession> findByHorse_HorseIdOrderByScheduledStartAsc(String horseId);

  List<TrainingSession> findByHorse_HorseIdAndStatusOrderByActualEndAsc(String horseId, String status);

  boolean existsByHorse_HorseIdAndScheduledStart(String horseId, LocalDateTime scheduledStart);
}
