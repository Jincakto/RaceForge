package com.raceforge.backend.horse.repository;

import com.raceforge.backend.horse.entity.Horse;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HorseRepository
        extends JpaRepository<Horse, String> {
}
