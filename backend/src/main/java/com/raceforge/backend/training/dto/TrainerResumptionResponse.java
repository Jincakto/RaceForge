package com.raceforge.backend.training.dto;

import java.time.LocalDateTime;

/** Read-only request derived from a paid ordinary package paused by Medical Lock. */
public record TrainerResumptionResponse(
        String horsePackageId, String horseId, String horseName,
        String packageName, String packageType, int remainingDays,
        LocalDateTime pausedAt, String healthStatus, boolean trainingLocked,
        boolean eligibleForResumption) {}
