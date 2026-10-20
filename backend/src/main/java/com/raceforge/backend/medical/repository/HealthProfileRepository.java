package com.raceforge.backend.medical.repository;

import com.raceforge.backend.medical.entity.HealthProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

<<<<<<< HEAD
public interface HealthProfileRepository extends JpaRepository<HealthProfile, String> {
=======
public interface HealthProfileRepository
        extends JpaRepository<HealthProfile, String> {
>>>>>>> 76de6e5 (luu code)

    Optional<HealthProfile> findByHorse_HorseId(String horseId);
}
