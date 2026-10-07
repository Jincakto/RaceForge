package com.raceforge.backend.horse.repository;

import com.raceforge.backend.horse.entity.Horse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface HorseRepository extends JpaRepository<Horse, String> {

    @Query(value = """
            SELECT TOP 1 horse_id
            FROM Horse
            WHERE horse_id LIKE 'HOR%'
            ORDER BY TRY_CAST(
                SUBSTRING(horse_id, 4, LEN(horse_id))
                AS INT
            ) DESC
            """, nativeQuery = true)
    String findLatestHorseId();
}
