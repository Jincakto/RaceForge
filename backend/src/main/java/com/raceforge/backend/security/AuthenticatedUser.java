package com.raceforge.backend.security;

public record AuthenticatedUser(
        Integer userId,
        String email,
        String status,
        Integer roleId,
        String roleName
) {
}
