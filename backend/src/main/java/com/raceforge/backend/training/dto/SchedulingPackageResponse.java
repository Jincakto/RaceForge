package com.raceforge.backend.training.dto;

import java.time.LocalDate;

/** Scheduling data only; does not expose the owner's payment details or history. */
public record SchedulingPackageResponse(Integer horsePackageId, String packageName,
        LocalDate startDate, LocalDate endDate) {}
