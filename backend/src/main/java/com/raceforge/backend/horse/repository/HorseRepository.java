
package com.raceforge.backend.horse.repository;

import com.raceforge.backend.horse.entity.Horse;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HorseRepository extends JpaRepository<Horse, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM Horse h WHERE h.horseId = :horseId")
    Optional<Horse> findByIdForUpdate(
            @Param("horseId") Integer horseId
    );
}
