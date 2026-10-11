package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.HealthProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HealthProfileRepository
        extends JpaRepository<HealthProfile, Integer> {

    Optional<HealthProfile> findByHorse_HorseId(Integer horseId);
}
