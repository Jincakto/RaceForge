package com.raceforge.backend.horse.service;

import com.raceforge.backend.horse.repository.HorseRaceHistoryRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.horse.repository.TrainerRepository;
import com.raceforge.backend.horse.repository.HorseAssignmentRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component("horseAccess")
public class HorseAccess {
<<<<<<< HEAD

    private final HorseRepository horses;
    private final HorseRaceHistoryRepository histories;
    private final TrainerRepository trainers;
    private final HorseAssignmentRepository medicalAssignments;

    public HorseAccess(
            HorseRepository horses,
            HorseRaceHistoryRepository histories,
            TrainerRepository trainers,
            HorseAssignmentRepository medicalAssignments) {
        this.horses = horses;
        this.histories = histories;
        this.trainers = trainers;
        this.medicalAssignments = medicalAssignments;
    }

    public boolean owns(Authentication authentication, String horseId) {
        AuthenticatedUser user = currentUser(authentication);
        if (user == null || !"HORSE_OWNER".equals(user.roleName())) {
            return false;
        }
        return horses.findById(horseId)
                .map(horse -> horse.getOwner() != null
                        && user.userId().equals(horse.getOwner().getUserId()))
                .orElse(false);
    }

    public boolean read(Authentication authentication, String horseId) {
        AuthenticatedUser user = currentUser(authentication);
        if (user == null) {
            return false;
        }
        if ("HORSE_OWNER".equals(user.roleName())) {
            return owns(authentication, horseId);
        }
        if ("HEAD_TRAINER".equals(user.roleName())) {
            return trainers.isAssigned(horseId, user.userId());
        }
        if ("VETERINARIAN".equals(user.roleName())) {
            return medicalAssignments.existsByHorse_HorseIdAndAssignee_UserIdAndKindAndStatusIn(
                    horseId, user.userId(), "VET", java.util.List.of("ASSIGNED", "ACCEPTED", "COMPLETED"));
        }
        return Set.of("CLUB_MANAGER", "GROOM").contains(user.roleName())
                && horses.existsById(horseId);
    }

    public boolean ownsRaceHistory(Authentication authentication, String raceHistoryId) {
        return histories.findById(raceHistoryId)
                .map(history -> owns(authentication, history.getHorse().getHorseId()))
                .orElse(false);
    }

    public boolean readRaceHistory(Authentication authentication, String raceHistoryId) {
        return histories.findById(raceHistoryId)
                .map(history -> read(authentication, history.getHorse().getHorseId()))
                .orElse(false);
    }

    private AuthenticatedUser currentUser(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AuthenticatedUser user)
                || !"ACTIVE".equals(user.status())) {
            return null;
        }
        return user;
=======
    @org.springframework.beans.factory.annotation.Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final HorseRepository horses;
    public HorseAccess(HorseRepository horses) { this.horses=horses; }
    public boolean owns(Authentication auth, String id) {
        if (!(auth.getPrincipal() instanceof AuthenticatedUser u) || !"HORSE_OWNER".equals(u.roleName()) || !"ACTIVE".equals(u.status())) return false;
        return horses.findById(id).map(h -> h.getOwner().getUserId().equals(u.userId())).orElse(false);
    }
    public boolean read(Authentication auth, String id) {
        if (!(auth.getPrincipal() instanceof AuthenticatedUser u) || !"ACTIVE".equals(u.status())) return false;
        if ("HORSE_OWNER".equals(u.roleName())) return owns(auth,id);
        if ("HEAD_TRAINER".equals(u.roleName())) return jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Horse_Assignment a JOIN dbo.Training_Assignment ta ON ta.assignment_id=a.id JOIN dbo.Trainer p ON p.user_id=a.assignee_id JOIN dbo.Trainer_Detail d ON d.trainer_id=p.trainer_id JOIN dbo.Horse_Trainer ht ON ht.trainer_id=p.trainer_id AND ht.horse_id=a.horse_id WHERE a.horse_id=? AND p.user_id=? AND d.status='ACTIVE' AND a.kind='TRAINER' AND a.status='ACCEPTED'",Integer.class,id,u.userId())>0;
        return java.util.Set.of("CLUB_MANAGER","VETERINARIAN","GROOM").contains(u.roleName());
>>>>>>> 76de6e5 (luu code)
    }
}
