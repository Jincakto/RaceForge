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

    public boolean canReadHorse(Authentication authentication, Integer horseId) {
        if (!has(authentication, "VIEW_TRAINING")) return false;
        AuthenticatedUser user = (AuthenticatedUser) authentication.getPrincipal();
        if (!"HORSE_OWNER".equals(user.roleName())) return true;
        return horses.findById(horseId)
                .map(h -> h.getOwner() != null && user.userId().equals(h.getOwner().getUserId()))
                .orElse(false);
    }
}
