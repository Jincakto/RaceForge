package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.TrainingLock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrainingLockRepository extends JpaRepository<TrainingLock, String> {

    Optional<TrainingLock> findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc(
            String horseId);

    List<TrainingLock> findByHorse_HorseIdOrderByLockedAtDesc(String horseId);
}
