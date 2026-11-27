package com.raceforge.backend.horse.service;

import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.horse.repository.TrainerRepository;
import com.raceforge.backend.horse.repository.HorseAssignmentRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component("horseAccess")
public class HorseAccess {

    private final HorseRepository horses;
    private final TrainerRepository trainers;
    private final HorseAssignmentRepository medicalAssignments;

    public HorseAccess(
            HorseRepository horses,
            TrainerRepository trainers,
            HorseAssignmentRepository medicalAssignments) {
        this.horses = horses;
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
            // Only the newest assignment grants access. An old COMPLETED task
            // must not restore access after the CM has reassigned this horse.
            return medicalAssignments.findFirstByHorse_HorseIdAndKindOrderByCreatedAtDesc(horseId, "VET")
                    .map(a -> a.getAssignee().getUserId().equals(user.userId())
                            && java.util.List.of("ASSIGNED", "ACCEPTED", "COMPLETED").contains(a.getStatus()))
                    .orElse(false);
        }
        return Set.of("CLUB_MANAGER", "GROOM").contains(user.roleName())
                && horses.existsById(horseId);
    }

    private AuthenticatedUser currentUser(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AuthenticatedUser user)
                || !"ACTIVE".equals(user.status())) {
            return null;
        }
        return user;
    }
}
