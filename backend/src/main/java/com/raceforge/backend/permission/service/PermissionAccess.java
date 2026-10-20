package com.raceforge.backend.permission.service;

import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Checks current database permissions; grants/revocations apply without reissuing JWTs. */
@Component("permissionAccess")
public class PermissionAccess {
    private final PermissionService permissions;
    private final HorseRepository horses;
    @org.springframework.beans.factory.annotation.Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;

    public PermissionAccess(PermissionService permissions, HorseRepository horses) {
        this.permissions = permissions;
        this.horses = horses;
    }

    public boolean has(Authentication authentication, String code) {
        return authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof AuthenticatedUser user
                && "ACTIVE".equals(user.status()) && user.roleName() != null
                && permissions.hasPermission(user.roleName(), code);
    }

    public boolean canReadHorse(Authentication authentication, String horseId) {
        if (!has(authentication, "VIEW_TRAINING")) return false;
        AuthenticatedUser user = (AuthenticatedUser) authentication.getPrincipal();
        if("CLUB_MANAGER".equals(user.roleName()))return true;
        if("HEAD_TRAINER".equals(user.roleName()))return jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Horse_Assignment a JOIN dbo.Trainer p ON p.user_id=a.assignee_id JOIN dbo.Trainer_Detail d ON d.trainer_id=p.trainer_id JOIN dbo.Horse_Trainer ht ON ht.horse_id=a.horse_id AND ht.trainer_id=p.trainer_id JOIN dbo.Training_Assignment ta ON ta.assignment_id=a.id JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=ta.horse_package_id WHERE a.horse_id=? AND p.user_id=? AND d.status='ACTIVE' AND a.kind='TRAINER' AND a.status='ACCEPTED' AND hp.payment_status='PAID' AND hp.status='ACTIVE'",Integer.class,horseId,user.userId())>0;
        if(!"HORSE_OWNER".equals(user.roleName()))return false;
        return horses.findById(horseId)
                .map(h -> h.getOwner() != null && user.userId().equals(h.getOwner().getUserId()))
                .orElse(false);
    }
}
