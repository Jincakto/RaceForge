package com.raceforge.backend.account.service;

public record GoogleIdentity(
        String subject,
        String email,
        boolean emailVerified,
        String name,
        String picture
) {
}
