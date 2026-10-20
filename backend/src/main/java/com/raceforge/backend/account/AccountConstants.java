package com.raceforge.backend.account;

import java.util.Set;

public final class AccountConstants {

    public static final String ROLE_MANAGER = "ROL-001";
    public static final String ROLE_HEAD_TRAINER = "ROL-002";
    public static final String ROLE_VETERINARIAN = "ROL-003";
    public static final String ROLE_GROOM = "ROL-004";
    public static final String ROLE_HORSE_OWNER = "ROL-005";
    public static final String ROLE_ADMIN = "ROL-007";
    public static final Set<String> STAFF_ROLES = Set.of(ROLE_MANAGER, ROLE_HEAD_TRAINER, ROLE_VETERINARIAN, ROLE_GROOM);
    public static final String STATUS_INVITED = "INVITED";
    public static final Set<String> BUSINESS_ROLES = Set.of(
            ROLE_MANAGER, ROLE_HEAD_TRAINER, ROLE_VETERINARIAN, ROLE_GROOM, ROLE_HORSE_OWNER);

    public static final String STATUS_UNVERIFIED = "UNVERIFIED";
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_REJECTED = "REJECTED";
    public static final String STATUS_INACTIVE = "INACTIVE";

    private AccountConstants() {
    }
}
