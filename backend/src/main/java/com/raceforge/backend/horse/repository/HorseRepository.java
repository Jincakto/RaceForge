package com.raceforge.backend.horse.repository;

import com.raceforge.backend.horse.entity.Horse;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface HorseRepository extends JpaRepository<Horse, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select h from Horse h where h.horseId = :horseId")
    Optional<Horse> findByIdForUpdate(@Param("horseId") Integer horseId);
}
