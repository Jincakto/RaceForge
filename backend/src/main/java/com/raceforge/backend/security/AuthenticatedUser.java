package com.raceforge.backend.security;

public record AuthenticatedUser(
        String userId,
        String email,
        String status,
        String roleId,
        String roleName
) {
}
