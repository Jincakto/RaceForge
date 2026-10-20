package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.entity.TrainingSession;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

/** Shared by scheduling, start, completion and attendance. Caller owns the transaction. */
@Component
public class TrainingSessionRules {
    @org.springframework.beans.factory.annotation.Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final HorseRepository horses;
    @PersistenceContext private EntityManager entityManager;

    public TrainingSessionRules(HorseRepository horses) { this.horses = horses; }

    public Horse lockHorse(String horseId) {
        Horse horse = horses.findByIdForUpdate(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));
        // The horse might already be loaded through a session/plan in this persistence context.
        entityManager.refresh(horse);
        return horse;
    }

    public void requireUnlocked(Horse horse) {
        if (Boolean.TRUE.equals(horse.getTrainingLocked()) || jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Lock WHERE horse_id=? AND unlocked_at IS NULL",Integer.class,horse.getHorseId())>0) {
            throw new BusinessRuleException("Horse is training-locked; this operation is not allowed.");
        }
    }

    public void requireOpen(TrainingSession session) {
        if (!"SCHEDULED".equals(session.getStatus())) {
            throw new BusinessRuleException("Only a SCHEDULED session can be changed.");
        }
    }
}
