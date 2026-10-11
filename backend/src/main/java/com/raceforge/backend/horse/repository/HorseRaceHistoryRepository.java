package com.raceforge.backend.horse.repository;

import com.raceforge.backend.horse.entity.HorseRaceHistory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HorseRaceHistoryRepository
        extends JpaRepository<HorseRaceHistory, Integer> {

    List<HorseRaceHistory> findByHorseHorseId(Integer horseId);
}

