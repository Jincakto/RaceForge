package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.TrainingLock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface TrainingLockRepository extends JpaRepository<TrainingLock, Integer> {
    Optional<TrainingLock> findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc(Integer horseId);
    List<TrainingLock> findByHorse_HorseIdOrderByLockedAtDesc(Integer horseId);
}
