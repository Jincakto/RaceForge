
package com.raceforge.backend.medical.service;

import java.math.BigDecimal;

public final class MedicalReferenceRange {

    private MedicalReferenceRange() {
    }

    public static final BigDecimal MIN_NORMAL_TEMPERATURE =
            new BigDecimal("37.5");

    public static final BigDecimal MAX_NORMAL_TEMPERATURE =
            new BigDecimal("38.5");

    public static final BigDecimal CRITICAL_HIGH_TEMPERATURE =
            new BigDecimal("39.0");

    public static final int MIN_NORMAL_HEART_RATE = 28;
    public static final int MAX_NORMAL_HEART_RATE = 44;

    public static final int CRITICAL_HIGH_HEART_RATE = 60;

    public static final int MIN_NORMAL_RESPIRATORY_RATE = 10;
    public static final int MAX_NORMAL_RESPIRATORY_RATE = 20;
}
