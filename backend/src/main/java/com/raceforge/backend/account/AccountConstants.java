package com.raceforge.backend.account;

import java.util.Set;

public final class AccountConstants {

    public static final Integer ROLE_MANAGER = 1;
    public static final Integer ROLE_HEAD_TRAINER = 2;
    public static final Integer ROLE_VETERINARIAN = 3;
    public static final Integer ROLE_GROOM = 4;
    public static final Integer ROLE_HORSE_OWNER = 5;
    public static final Integer ROLE_USER = 6;
    public static final Set<Integer> BUSINESS_ROLES = Set.of(
            ROLE_MANAGER, ROLE_HEAD_TRAINER, ROLE_VETERINARIAN, ROLE_GROOM, ROLE_HORSE_OWNER);

    public static final Set<Integer> SELF_REGISTRATION_ROLES = Set.of(
            ROLE_HEAD_TRAINER,
            ROLE_VETERINARIAN,
            ROLE_GROOM,
            ROLE_HORSE_OWNER
    );

    public static final String STATUS_UNVERIFIED = "UNVERIFIED";
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_REJECTED = "REJECTED";
    public static final String STATUS_INACTIVE = "INACTIVE";

    public static final String REQUEST_PENDING = "PENDING";
    public static final String REQUEST_APPROVED = "APPROVED";
    public static final String REQUEST_REJECTED = "REJECTED";

    private AccountConstants() {
    }
}
