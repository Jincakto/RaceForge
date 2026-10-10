package com.raceforge.backend.account;

import java.util.Set;

public final class AccountConstants {

    public static final String ROLE_MANAGER = "ROL001";
    public static final String ROLE_HEAD_TRAINER = "ROL002";
    public static final String ROLE_VETERINARIAN = "ROL003";
    public static final String ROLE_GROOM = "ROL004";
    public static final String ROLE_HORSE_OWNER = "ROL005";

    public static final Set<String> SELF_REGISTRATION_ROLES = Set.of(
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
