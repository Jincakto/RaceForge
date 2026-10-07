package com.raceforge.backend.horse.repository;

import com.raceforge.backend.horse.entity.HorseRaceHistory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HorseRaceHistoryRepository
        extends JpaRepository<HorseRaceHistory, String> {

    List<HorseRaceHistory> findByHorseHorseId(String horseId);

    @Query(value = """
            SELECT TOP 1 race_history_id
            FROM HORSE_RACE_HISTORY
            WHERE race_history_id LIKE 'RHI%'
            ORDER BY TRY_CAST(
                SUBSTRING(
                    race_history_id,
                    4,
                    LEN(race_history_id)
                ) AS INT
            ) DESC
            """, nativeQuery = true)
    String findLatestRaceHistoryId();
}
