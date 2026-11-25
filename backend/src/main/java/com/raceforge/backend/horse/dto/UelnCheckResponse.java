package com.raceforge.backend.horse.dto;

/** Availability in RaceForge only; does not verify an external horse registry. */
public record UelnCheckResponse(boolean validFormat, boolean prefixRecognized, boolean exists, String message) {
}
