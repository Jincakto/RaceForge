package com.raceforge.backend.training.mapper;

import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class HorsePackageMapperExpirationTest {
    private final HorsePackageMapper mapper = new HorsePackageMapper();

    private HorsePackage registration() {
        Horse h = new Horse();
        h.setHorseId("HOR-001");
        TrainingPackage p = new TrainingPackage();
        p.setPackageId("PKG-000001");
        HorsePackage hp = new HorsePackage();
        hp.setHorse(h);
        hp.setTrainingPackage(p);
        hp.setStatus("ACTIVE");
        hp.setRemainingDays(30);
        return hp;
    }

    @Test
    void activeRegistrationShowsRealRemainingDays() {
        HorsePackage hp = registration();
        hp.setEndDate(LocalDate.now().plusDays(4));
        assertEquals(5, mapper.toResponse(hp).remainingDays());
    }

    @Test
    void pausedRegistrationKeepsFrozenDays() {
        HorsePackage hp = registration();
        hp.setStatus("PAUSED");
        hp.setEndDate(LocalDate.now().minusDays(10));
        hp.setRemainingDays(12);
        assertEquals(12, mapper.toResponse(hp).remainingDays());
    }

    @Test
    void completedRegistrationDisplaysZero() {
        HorsePackage hp = registration();
        hp.setStatus("COMPLETED");
        assertEquals(0, mapper.toResponse(hp).remainingDays());
    }
}
