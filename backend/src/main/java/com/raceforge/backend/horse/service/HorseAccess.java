package com.raceforge.backend.horse.service;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
@Component("horseAccess")
public class HorseAccess {
    private final HorseRepository horses;
    public HorseAccess(HorseRepository horses) { this.horses=horses; }
    public boolean owns(Authentication auth, Integer id) {
        if (!(auth.getPrincipal() instanceof AuthenticatedUser u) || !"HORSE_OWNER".equals(u.roleName()) || !"ACTIVE".equals(u.status())) return false;
        return horses.findById(id).map(h -> h.getOwner().getUserId().equals(u.userId())).orElse(false);
    }
    public boolean read(Authentication auth, Integer id) {
        if (!(auth.getPrincipal() instanceof AuthenticatedUser u) || !"ACTIVE".equals(u.status())) return false;
        if ("HORSE_OWNER".equals(u.roleName())) return owns(auth,id);
        if ("HEAD_TRAINER".equals(u.roleName())) return horses.findById(id).map(h -> h.getHeadTrainer()!=null && h.getHeadTrainer().getUserId().equals(u.userId())).orElse(false);
        return java.util.Set.of("CLUB_MANAGER","VETERINARIAN","GROOM").contains(u.roleName());
    }
}
