package com.raceforge.backend.security;

public record AuthenticatedUser(
        String userId,
        String email,
        String status,
        Integer roleId,
        String roleName
) {
}
